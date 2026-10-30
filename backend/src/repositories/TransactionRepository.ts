import db from '../config/db';
import { Transaction } from '../models/Transaction';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class TransactionRepository {
  async cardBelongsToUser(userId: number, cardName: string): Promise<boolean> {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM cards WHERE user_id = ? AND name = ? LIMIT 1',
      [userId, cardName],
    );
    return rows.length > 0;
  }

  private toValues(transaction: Transaction): (number | string | boolean | null | Date)[] {
    return [
      transaction.user_id, transaction.description, transaction.amount, transaction.type,
      transaction.category, transaction.date, transaction.is_fixed ?? false,
      transaction.installments ?? 1, transaction.installment_number ?? 1,
      transaction.recurrence_end_date ?? null, transaction.account_id ?? null,
      transaction.installment_group_id ?? null,
      transaction.card ?? null,
      transaction.is_paid ? 1 : 0,
    ];
  }
  
  async create(transaction: Transaction): Promise<Transaction> {
    const query = `
      INSERT INTO transactions
        (user_id, description, amount, type, category, date, is_fixed, installments, installment_number, recurrence_end_date, account_id, installment_group_id, card, is_paid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = this.toValues(transaction);

    const [result] = await db.execute<ResultSetHeader>(query, values);

    return {
      id: result.insertId,
      ...transaction
    };
  }

  async createMany(transactions: Transaction[]): Promise<Transaction[]> {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const query = `
        INSERT INTO transactions
          (user_id, description, amount, type, category, date, is_fixed, installments, installment_number, recurrence_end_date, account_id, installment_group_id, card, is_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const created: Transaction[] = [];
      for (const transaction of transactions) {
        const [result] = await connection.execute<ResultSetHeader>(query, this.toValues(transaction));
        created.push({ id: result.insertId, ...transaction });
      }
      await connection.commit();
      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findByUserId(userId: number, options: {
    month?: number; year?: number; search?: string; category?: string; card?: string; group?: 'card' | 'category'; type?: 'income' | 'expense';
    status?: 'paid' | 'pending';
    page: number; pageSize: number;
  }): Promise<{ rows: Transaction[]; total: number }> {
    const filters = ['user_id = ?'];
    const values: (number | string)[] = [userId];
    if (options.month !== undefined && options.year !== undefined) {
      filters.push('MONTH(date) = ?', 'YEAR(date) = ?');
      values.push(options.month, options.year);
    }
    if (options.search) {
      filters.push("(description LIKE ? OR category LIKE ? OR card LIKE ? OR REPLACE(card, '_', ' ') LIKE ?)");
      values.push(
        `%${options.search}%`,
        `%${options.search}%`,
        `%${options.search}%`,
        `%${options.search}%`,
      );
    }
    if (options.category) {
      filters.push('category = ?');
      values.push(options.category);
    }
    if (options.card) {
      filters.push('card = ?');
      values.push(options.card);
    }
    if (options.type) {
      filters.push('type = ?');
      values.push(options.type);
    }
    if (options.status === 'paid') {
      filters.push('is_paid = 1');
    } else if (options.status === 'pending') {
      filters.push("type = 'expense' AND (is_paid = 0 OR is_paid IS NULL)");
    }
    const where = filters.join(' AND ');
    const offset = (options.page - 1) * options.pageSize;
    const orderBy = options.group === 'card'
      ? 'CASE WHEN card IS NULL OR card = \'\' THEN 1 ELSE 0 END, card ASC, date DESC, id DESC'
      : options.group === 'category'
        ? 'category ASC, date DESC, id DESC'
        : 'date DESC, id DESC';
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT * FROM transactions WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...values, options.pageSize, offset],
    );
    const [countRows] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM transactions WHERE ${where}`, values,
    );
    const transactions = rows.map((r) => ({
      ...r,
      is_paid: Boolean(r.is_paid),
    })) as Transaction[];
    return { rows: transactions, total: Number(countRows[0]?.total ?? 0) };
  }

  async findById(id: number): Promise<Transaction | null> {
    const query = 'SELECT * FROM transactions WHERE id = ?';
    const [rows] = await db.execute<RowDataPacket[]>(query, [id]);
    
    if (rows.length === 0) return null;
    return {
      ...rows[0],
      is_paid: Boolean(rows[0].is_paid),
    } as Transaction;
  }

  async update(id: number, transaction: Transaction): Promise<void> {
    const query = `
      UPDATE transactions 
      SET description = ?, amount = ?, type = ?, category = ?, date = ?, card = ?, is_paid = ?
      WHERE id = ? AND user_id = ?
    `;
    const values = [
      transaction.description,
      transaction.amount,
      transaction.type,
      transaction.category,
      transaction.date,
      transaction.card ?? null,
      transaction.is_paid ? 1 : 0,
      id,
      transaction.user_id
    ];

    await db.execute(query, values);
  }

  async updatePaymentStatus(id: number, userId: number, isPaid: boolean): Promise<boolean> {
    const [result] = await db.execute<ResultSetHeader>(
      'UPDATE transactions SET is_paid = ? WHERE id = ? AND user_id = ?',
      [isPaid ? 1 : 0, id, userId],
    );
    return result.affectedRows > 0;
  }

  async updateInstallmentSeries(
    existingTransaction: Transaction,
    transaction: Transaction,
  ): Promise<void> {
    if (existingTransaction.id === undefined || transaction.id === undefined) {
      throw new Error('Transação inválida para atualização.');
    }

    const totalInstallments = existingTransaction.installments ?? 1;
    const installmentNumber = existingTransaction.installment_number ?? 1;
    const baseDescription = transaction.description.replace(/\s\(\d+\/\d+\)$/, '');
    const query = `
      UPDATE transactions
      SET description = CONCAT(?, ' (', installment_number, '/', installments, ')'),
          amount = ?,
          type = ?,
          category = ?,
          card = ?,
          date = DATE(TIMESTAMPADD(MONTH, installment_number - ?, ?))
      WHERE user_id = ?
        AND type = 'expense'
        AND is_fixed = 0
        AND installments = ?
        AND installment_number >= ?
        AND (
          (? IS NOT NULL AND installment_group_id = ?)
          OR (
            ? IS NULL
            AND description LIKE ?
            AND category = ?
            AND amount = ?
          )
        )
    `;

    await db.execute(query, [
      baseDescription,
      transaction.amount,
      transaction.type,
      transaction.category,
      transaction.card ?? null,
      installmentNumber,
      transaction.date,
      transaction.user_id,
      totalInstallments,
      installmentNumber,
      existingTransaction.installment_group_id ?? null,
      existingTransaction.installment_group_id ?? null,
      existingTransaction.installment_group_id ?? null,
      `${existingTransaction.description.replace(/\s\(\d+\/\d+\)$/, '')} (%/${totalInstallments})`,
      existingTransaction.category,
      existingTransaction.amount,
    ]);
  }

  async delete(id: number, userId: number): Promise<void> {
    const query = 'DELETE FROM transactions WHERE id = ? AND user_id = ?';
    await db.execute(query, [id, userId]);
  }

  async deleteInstallmentSeries(userId: number, transaction: Transaction): Promise<void> {
    const baseDescription = transaction.description.replace(/\s\(\d+\/\d+\)$/, '');
    await db.execute(
      `DELETE FROM transactions
       WHERE user_id = ?
         AND type = 'expense'
         AND is_fixed = 0
          AND installments = ?
          AND (
            (? IS NOT NULL AND installment_group_id = ?)
            OR (
              ? IS NULL
              AND category = ?
              AND amount = ?
              AND description LIKE ?
            )
          )`,
      [
         userId,
         transaction.installments ?? 1,
         transaction.installment_group_id ?? null,
         transaction.installment_group_id ?? null,
         transaction.installment_group_id ?? null,
         transaction.category,
         transaction.amount,
         `${baseDescription} (%/${transaction.installments ?? 1})`,
      ],
    );
  }

  async deleteFixedIncomeFromDate(userId: number, transaction: Transaction): Promise<void> {
    if (transaction.id === undefined) {
      throw new Error('Transação inválida para exclusão.');
    }
    const baseDescription = transaction.description.replace(/\s\(\d+\/12\)$/, '');
    const query = `
      DELETE FROM transactions
      WHERE user_id = ?
        AND date >= ?
        AND (
          id = ?
          OR (
            type = 'income'
            AND is_fixed = 1
            AND category = ?
            AND amount = ?
            AND description LIKE ?
          )
        )
    `;
    await db.execute(query, [
      userId,
      transaction.date,
      transaction.id,
      transaction.category,
      transaction.amount,
      `${baseDescription} (%/12)`,
    ]);
  }

  async getSummary(userId: number, month?: number, year?: number): Promise<{
    totalIncome: number;
    totalExpense: number;
    paidExpense: number;
    pendingExpense: number;
    balance: number;
    realizedBalance: number;
  }> {
    const period = month !== undefined && year !== undefined ? ' AND MONTH(date) = ? AND YEAR(date) = ?' : '';
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpense,
        COALESCE(SUM(CASE WHEN type = 'expense' AND is_paid = 1 THEN amount ELSE 0 END), 0) AS paidExpense,
        COALESCE(SUM(CASE WHEN type = 'expense' AND (is_paid = 0 OR is_paid IS NULL) THEN amount ELSE 0 END), 0) AS pendingExpense,
        COALESCE(SUM(CASE WHEN date <= CURRENT_DATE AND type = 'income' THEN amount
          WHEN date <= CURRENT_DATE AND type = 'expense' THEN -amount ELSE 0 END), 0) AS realizedBalance
      FROM transactions 
      WHERE user_id = ?${period}
    `;

    const values = month !== undefined && year !== undefined ? [userId, month, year] : [userId];
    const [rows] = await db.execute<RowDataPacket[]>(query, values);
    const row = rows[0];

    // Convertemos para Number pois o driver do MySQL pode retornar campos DECIMAL como string
    const totalIncome = Number(row?.totalIncome) || 0;
    const totalExpense = Number(row?.totalExpense) || 0;
    const paidExpense = Number(row?.paidExpense) || 0;
    const pendingExpense = Number(row?.pendingExpense) || 0;
    const balance = totalIncome - totalExpense;
    const realizedBalance = Number(row?.realizedBalance) || 0;

    return {
      totalIncome,
      totalExpense,
      paidExpense,
      pendingExpense,
      balance,
      realizedBalance
    };
  }
}

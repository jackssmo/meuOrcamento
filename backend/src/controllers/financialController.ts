import { Response } from 'express';
import db from '../config/db';
import { AuthRequest } from '../middleware/auth.middleware';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { financialSchemas, FinancialResource } from '../validators/financial.schema';

type Resource = 'cards' | 'accounts' | 'categories' | 'budgets' | 'goals';

const resourceConfig = {
  cards: {
    table: 'cards',
    columns: ['name', 'credit_limit'],
    required: ['name'],
  },
  accounts: {
    table: 'accounts',
    columns: ['name', 'type', 'initial_balance', 'credit_limit', 'closing_day', 'due_day'],
    required: ['name', 'type'],
  },
  categories: {
    table: 'categories',
    columns: ['name', 'type', 'color'],
    required: ['name', 'type'],
  },
  budgets: {
    table: 'budgets',
    columns: ['category', 'month', 'year', 'amount'],
    required: ['category', 'month', 'year', 'amount'],
  },
  goals: {
    table: 'goals',
    columns: ['name', 'target_amount', 'current_amount', 'deadline'],
    required: ['name', 'target_amount'],
  },
} as const;

function getUserId(req: AuthRequest): number | null {
  return req.user?.id ?? null;
}

function parseResourceBody(resource: Resource, body: unknown, partial = false): Record<string, unknown> {
  const schema = financialSchemas[resource as FinancialResource];
  const result = (partial ? schema.partial() : schema).safeParse(body);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export class FinancialController {
  async list(resource: Resource, req: AuthRequest, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });

    if (resource === 'cards') {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
           c.id,
           c.user_id,
           c.name,
           CAST(COALESCE(c.credit_limit, 0) AS DECIMAL(12,2)) AS credit_limit,
           c.created_at,
           COALESCE(SUM(CASE WHEN t.type = 'expense' AND (t.is_paid IS FALSE OR t.is_paid = 0) THEN t.amount ELSE 0 END), 0) AS used_limit
         FROM cards c
         LEFT JOIN transactions t 
           ON t.user_id = c.user_id 
           AND t.card = c.name 
           AND t.type = 'expense' 
           AND (t.is_paid IS FALSE OR t.is_paid = 0)
         WHERE c.user_id = ?
         GROUP BY c.id, c.user_id, c.name, c.credit_limit, c.created_at
         ORDER BY c.id DESC`,
        [userId],
      );
      const formatted = rows.map((r) => {
        const limit = Number(r.credit_limit) || 0;
        const used = Number(r.used_limit) || 0;
        return {
          ...r,
          credit_limit: limit,
          used_limit: used,
          available_limit: limit - used,
        };
      });
      return res.status(200).json(formatted);
    }

    const { table } = resourceConfig[resource];
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT * FROM ${table} WHERE user_id = ? ORDER BY id DESC`,
      [userId],
    );
    return res.status(200).json(rows);
  }

  async create(resource: Resource, req: AuthRequest, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });
    const config = resourceConfig[resource];
    let body: Record<string, unknown>;
    try {
      body = parseResourceBody(resource, req.body);
    } catch (error) {
      throw error;
    }

    const values = config.columns.map((column) => body[column] ?? null);
    const placeholders = config.columns.map(() => '?').join(', ');
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO ${config.table} (user_id, ${config.columns.join(', ')}) VALUES (?, ${placeholders})`,
      [userId, ...values],
    );

    if (resource === 'cards') {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
           c.id,
           c.user_id,
           c.name,
           CAST(COALESCE(c.credit_limit, 0) AS DECIMAL(12,2)) AS credit_limit,
           c.created_at,
           COALESCE(SUM(CASE WHEN t.type = 'expense' AND (t.is_paid IS FALSE OR t.is_paid = 0) THEN t.amount ELSE 0 END), 0) AS used_limit
         FROM cards c
         LEFT JOIN transactions t 
           ON t.user_id = c.user_id 
           AND t.card = c.name 
           AND t.type = 'expense' 
           AND (t.is_paid IS FALSE OR t.is_paid = 0)
         WHERE c.id = ? AND c.user_id = ?
         GROUP BY c.id, c.user_id, c.name, c.credit_limit, c.created_at`,
        [result.insertId, userId],
      );
      const row = rows[0];
      if (row) {
        const limit = Number(row.credit_limit) || 0;
        const used = Number(row.used_limit) || 0;
        return res.status(201).json({
          ...row,
          credit_limit: limit,
          used_limit: used,
          available_limit: limit - used,
        });
      }
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT * FROM ${config.table} WHERE id = ? AND user_id = ?`,
      [result.insertId, userId],
    );
    return res.status(201).json(rows[0]);
  }

  async update(resource: Resource, req: AuthRequest, res: Response): Promise<Response> {
    const userId = getUserId(req);
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
    const config = resourceConfig[resource];
    const body = parseResourceBody(resource, req.body, true);
    const assignments = config.columns.filter((column) => body[column] !== undefined);
    if (assignments.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    let previousCardName: string | null = null;
    if (resource === 'cards' && assignments.includes('name')) {
      const [cardRows] = await db.execute<RowDataPacket[]>(
        'SELECT name FROM cards WHERE id = ? AND user_id = ?',
        [id, userId],
      );
      previousCardName = cardRows[0]?.name ?? null;
    }
    const values = assignments.map((column) => body[column]) as (string | number | null)[];
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE ${config.table} SET ${assignments.map((column) => `${column} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
      [...values, id, userId],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro não encontrado.' });
    if (resource === 'cards' && previousCardName !== null && body.name !== previousCardName) {
      await db.execute(
        'UPDATE transactions SET card = ? WHERE user_id = ? AND card = ?',
        [body.name as string, userId, previousCardName],
      );
    }
    if (resource === 'cards') {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT 
           c.id,
           c.user_id,
           c.name,
           CAST(COALESCE(c.credit_limit, 0) AS DECIMAL(12,2)) AS credit_limit,
           c.created_at,
           COALESCE(SUM(CASE WHEN t.type = 'expense' AND (t.is_paid IS FALSE OR t.is_paid = 0) THEN t.amount ELSE 0 END), 0) AS used_limit
         FROM cards c
         LEFT JOIN transactions t 
           ON t.user_id = c.user_id 
           AND t.card = c.name 
           AND t.type = 'expense' 
           AND (t.is_paid IS FALSE OR t.is_paid = 0)
         WHERE c.id = ? AND c.user_id = ?
         GROUP BY c.id, c.user_id, c.name, c.credit_limit, c.created_at`,
        [id, userId],
      );
      const row = rows[0];
      if (row) {
        const limit = Number(row.credit_limit) || 0;
        const used = Number(row.used_limit) || 0;
        return res.status(200).json({
          ...row,
          credit_limit: limit,
          used_limit: used,
          available_limit: limit - used,
        });
      }
      return res.status(200).json(rows[0]);
    }
    return res.status(204).send();
  }

  async remove(resource: Resource, req: AuthRequest, res: Response): Promise<Response> {
    const userId = getUserId(req);
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido.' });
    const { table } = resourceConfig[resource];
    const [result] = await db.execute<ResultSetHeader>(
      `DELETE FROM ${table} WHERE id = ? AND user_id = ?`,
      [id, userId],
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro não encontrado.' });
    return res.status(204).send();
  }

  async report(req: AuthRequest, res: Response): Promise<Response> {
    const userId = getUserId(req);
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: 'Informe um ano válido.' });
    }
    if (!req.query.month) {
      const [monthlyRows] = await db.execute<RowDataPacket[]>(
        `SELECT MONTH(date) AS month, SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
         FROM transactions WHERE user_id = ? AND YEAR(date) = ?
         GROUP BY MONTH(date) ORDER BY month`,
        [userId, year],
      );
      return res.status(200).json({ monthly: monthlyRows });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Informe um mês válido.' });
    }
    const [categoryRows] = await db.execute<RowDataPacket[]>(
      `SELECT category, type, SUM(amount) AS total
       FROM transactions
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
       GROUP BY category, type ORDER BY total DESC`,
      [userId, month, year],
    );
    const [dailyRows] = await db.execute<RowDataPacket[]>(
      `SELECT DATE(date) AS date, type, SUM(amount) AS total
       FROM transactions
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
       GROUP BY DATE(date), type ORDER BY date`,
      [userId, month, year],
    );
    const [cardRows] = await db.execute<RowDataPacket[]>(
      `SELECT 
         COALESCE(NULLIF(TRIM(card), ''), 'Sem cartão') AS card, 
         SUM(amount) AS total,
         SUM(CASE WHEN is_paid = 1 THEN amount ELSE 0 END) AS paid_total,
         SUM(CASE WHEN is_paid = 0 OR is_paid IS NULL THEN amount ELSE 0 END) AS unpaid_total
       FROM transactions
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ? AND type = 'expense'
         AND NULLIF(TRIM(card), '') IS NOT NULL
       GROUP BY COALESCE(NULLIF(TRIM(card), ''), 'Sem cartão')
       ORDER BY total DESC`,
      [userId, month, year],
    );
    return res.status(200).json({ byCategory: categoryRows, byCard: cardRows, daily: dailyRows });
  }

  /**
   * Paga a fatura de um cartão: marca todas as despesas do cartão
   * no mês/ano indicado como is_paid = true.
   */
  async payCardBill(req: AuthRequest, res: Response): Promise<Response> {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });

    const cardId = Number(req.params.id);
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return res.status(400).json({ error: 'ID do cartão inválido.' });
    }

    const month = Number(req.body?.month);
    const year = Number(req.body?.year);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Informe um mês válido (1–12).' });
    }
    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({ error: 'Informe um ano válido.' });
    }

    // Garante que o cartão pertence ao usuário
    const [cardRows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name FROM cards WHERE id = ? AND user_id = ? LIMIT 1',
      [cardId, userId],
    );
    if (cardRows.length === 0) {
      return res.status(404).json({ error: 'Cartão não encontrado.' });
    }
    const cardName = cardRows[0].name as string;

    // Conta quantas despesas serão afetadas
    const [countRows] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total, SUM(amount) AS total_amount
       FROM transactions
       WHERE user_id = ? AND card = ? AND type = 'expense'
         AND MONTH(date) = ? AND YEAR(date) = ?
         AND (is_paid = 0 OR is_paid IS NULL)`,
      [userId, cardName, month, year],
    );
    const count = Number(countRows[0]?.total ?? 0);
    const totalAmount = Number(countRows[0]?.total_amount ?? 0);

    if (count === 0) {
      return res.status(200).json({
        message: `Nenhuma despesa pendente do cartão "${cardName}" em ${month}/${year}.`,
        updated: 0,
        totalAmount: 0,
      });
    }

    // Marca todas como pagas
    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE transactions
       SET is_paid = TRUE
       WHERE user_id = ? AND card = ? AND type = 'expense'
         AND MONTH(date) = ? AND YEAR(date) = ?
         AND (is_paid = 0 OR is_paid IS NULL)`,
      [userId, cardName, month, year],
    );

    return res.status(200).json({
      message: `Fatura de "${cardName}" (${month}/${year}) paga com sucesso!`,
      updated: result.affectedRows,
      totalAmount,
    });
  }
}

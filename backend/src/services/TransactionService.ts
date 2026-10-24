import { Transaction } from '../models/Transaction';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { transactionSchema } from '../validators/transaction.schema';
import { getMonthlyOccurrenceDate } from '../utils/recurrenceDate';
import { randomUUID } from 'node:crypto';

export class TransactionService {
    constructor(private transactionRepository: TransactionRepository) { }

    async createTransaction(userId: number, data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>): Promise<Transaction> {
        const parsed = transactionSchema.safeParse(data);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados da transação inválidos.');
        const { description, amount, type, category, date, installments, is_fixed, account_id, card, is_paid } = parsed.data;
        if (card && !(await this.transactionRepository.cardBelongsToUser(userId, card))) {
            throw new Error('O cartão selecionado não pertence à sua conta.');
        }
        if (is_fixed && type !== 'income') {
            throw new Error("A recorrência fixa está disponível apenas para receitas.");
        }

        const occurrenceCount = is_fixed ? 12 : (installments ?? 1);
        const installmentAmount = Math.round(amount * 100) / 100;
        const firstDate = new Date(date);
        firstDate.setUTCHours(0, 0, 0, 0);
        if (Number.isNaN(firstDate.getTime())) {
            throw new Error("A data da transação é inválida.");
        }
        const newTransactions: Transaction[] = [];
        const installmentGroupId = occurrenceCount > 1 ? randomUUID() : null;

        for (let occurrence = 0; occurrence < occurrenceCount; occurrence += 1) {
            const transactionDate = getMonthlyOccurrenceDate(firstDate, occurrence);
            const descriptionWithOccurrence = is_fixed
                ? `${description} (${occurrence + 1}/12)`
                : occurrenceCount > 1
                    ? `${description} (${occurrence + 1}/${occurrenceCount})`
                    : description;
            newTransactions.push({
                user_id: userId,
                description: descriptionWithOccurrence,
                amount: installmentAmount,
                type,
                category,
                date: transactionDate.toISOString().substring(0, 10),
                is_fixed: Boolean(is_fixed),
                installments: occurrenceCount,
                installment_number: occurrence + 1,
                installment_group_id: installmentGroupId,
                account_id,
                card: type === 'expense' ? card ?? null : null,
                is_paid: Boolean(is_paid),
            });
        }
        const created = await this.transactionRepository.createMany(newTransactions);
        return created[0] as Transaction;
    }

    async updateTransaction(
        id: number,
        userId: number,
        data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>,
        updateSeries = false,
    ): Promise<Transaction> {

        const existingTransaction = await this.transactionRepository.findById(id);

        if (!existingTransaction) {
            throw new Error('Transação não encontrada.');
        }

        if (existingTransaction.user_id !== userId) {
            throw new Error('Acesso negado. Você não tem permissão para alterar esta transação.');
        }

        const parsed = transactionSchema.safeParse(data);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados da transação inválidos.');
        if (parsed.data.card && !(await this.transactionRepository.cardBelongsToUser(userId, parsed.data.card))) {
            throw new Error('O cartão selecionado não pertence à sua conta.');
        }

        const updatedTransaction: Transaction = {
            id,
            user_id: userId,
            ...parsed.data,
            card: parsed.data.card ?? null,
            is_paid: Boolean(parsed.data.is_paid),
            date: parsed.data.date.toISOString().substring(0, 10),
        };

        const isInstallmentExpense =
            existingTransaction.type === 'expense' &&
            !existingTransaction.is_fixed &&
            (existingTransaction.installments ?? 1) > 1;

        if (isInstallmentExpense && updateSeries) {
            await this.transactionRepository.updateInstallmentSeries(
                existingTransaction,
                updatedTransaction,
            );
        } else {
            await this.transactionRepository.update(id, updatedTransaction);
        }

        return updatedTransaction;
    }

    async togglePaymentStatus(id: number, userId: number, isPaid?: boolean): Promise<{ id: number; is_paid: boolean }> {
        const existingTransaction = await this.transactionRepository.findById(id);

        if (!existingTransaction) {
            throw new Error('Transação não encontrada.');
        }

        if (existingTransaction.user_id !== userId) {
            throw new Error('Acesso negado. Você não tem permissão para alterar esta transação.');
        }

        const newStatus = typeof isPaid === 'boolean' ? isPaid : !existingTransaction.is_paid;
        await this.transactionRepository.updatePaymentStatus(id, userId, newStatus);
        return { id, is_paid: newStatus };
    }

    async deleteTransaction(
        id: number,
        userId: number,
        deleteSeries = false,
    ): Promise<{ deletedFutureIncome: boolean; deletedSeries: boolean }> {
        const existingTransaction = await this.transactionRepository.findById(id);

        if (!existingTransaction) {
            throw new Error('Transação não encontrada.');
        }

        if (existingTransaction.user_id !== userId) {
            throw new Error('Acesso negado. Você não tem permissão para excluir esta transação.');
        }

        const isFixedIncome = existingTransaction.type === 'income' && Boolean(existingTransaction.is_fixed);
        if (isFixedIncome && deleteSeries) {
            await this.transactionRepository.deleteFixedIncomeFromDate(userId, existingTransaction);
        } else if (
            deleteSeries &&
            existingTransaction.type === 'expense' &&
            !existingTransaction.is_fixed &&
            (existingTransaction.installments ?? 1) > 1
        ) {
            await this.transactionRepository.deleteInstallmentSeries(userId, existingTransaction);
        } else {
            await this.transactionRepository.delete(id, userId);
        }

        return {
            deletedFutureIncome: isFixedIncome && deleteSeries,
            deletedSeries:
                deleteSeries &&
                existingTransaction.type === 'expense' &&
                !existingTransaction.is_fixed &&
                (existingTransaction.installments ?? 1) > 1,
        };
    }

    async getTransactionSummary(userId: number, month?: number, year?: number) {
        return await this.transactionRepository.getSummary(userId, month, year);
    }

    async getTransactionsByUserId(userId: number, options: Parameters<TransactionRepository['findByUserId']>[1]) {
        return await this.transactionRepository.findByUserId(userId, options);
    }
}

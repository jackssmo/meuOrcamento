import { Response } from 'express';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionService } from '../services/TransactionService';
import { AuthRequest } from '../middleware/auth.middleware';

const transactionRepository = new TransactionRepository();
const transactionService = new TransactionService(transactionRepository);

export class TransactionController {
    async create(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }
            const transaction = await transactionService.createTransaction(userId, req.body);
            return res.status(201).json(transaction);
        }
        catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async list(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }
            const page = Math.max(1, Number(req.query.page) || 1);
            const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
            const month = req.query.month ? Number(req.query.month) : undefined;
            const year = req.query.year ? Number(req.query.year) : undefined;
            const type = req.query.type === 'income' || req.query.type === 'expense' ? req.query.type : undefined;
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
            const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
            const card = typeof req.query.card === 'string' ? req.query.card.trim() : undefined;
            const group = req.query.group === 'card' || req.query.group === 'category' ? req.query.group : undefined;
            const status = req.query.status === 'paid' || req.query.status === 'pending' ? req.query.status : undefined;
            const options = { page, pageSize } as Parameters<typeof transactionService.getTransactionsByUserId>[1];
            if (month !== undefined) options.month = month;
            if (year !== undefined) options.year = year;
            if (type !== undefined) options.type = type;
            if (search !== undefined) options.search = search;
            if (category !== undefined) options.category = category;
            if (card !== undefined) options.card = card;
            if (group !== undefined) options.group = group;
            if (status !== undefined) options.status = status;
            const result = await transactionService.getTransactionsByUserId(userId, options);
            return res.status(200).json({ data: result.rows, pagination: { page, pageSize, total: result.total, totalPages: Math.ceil(result.total / pageSize) } });
        }
        catch (error: any) {
            return res.status(400).json({ message: error.message });
        }
    }

    async update(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            const id = req.params.id;

            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            if (typeof id !== 'string' || !/^\d+$/.test(id)) {
                return res.status(400).json({ error: 'ID de transação inválido.' });
            }

            const transactionId = Number(id);

            if (transactionId <= 0) {
                return res.status(400).json({ error: 'ID de transação inválido.' });
            }

            const updatedTransaction = await transactionService.updateTransaction(
                transactionId,
                userId,
                req.body,
                req.query.scope === 'series',
            );

            return res.status(200).json(updatedTransaction);

        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    async updatePaymentStatus(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            const id = req.params.id;

            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            if (typeof id !== 'string' || !/^\d+$/.test(id)) {
                return res.status(400).json({ error: 'ID de transação inválido.' });
            }

            const transactionId = Number(id);

            if (transactionId <= 0) {
                return res.status(400).json({ error: 'ID de transação inválido.' });
            }

            const isPaid = typeof req.body?.is_paid === 'boolean' ? req.body.is_paid : undefined;
            const result = await transactionService.togglePaymentStatus(transactionId, userId, isPaid);

            return res.status(200).json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    async delete(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;
            const id = req.params.id;

            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            if (typeof id !== 'string' || !/^\d+$/.test(id)) {
                return res.status(400).json({ error: 'ID de transação inválido.' });
            }

            const transactionId = Number(id);

            if (transactionId <= 0) {
                return res.status(400).json({ error: 'ID de transação inválido.' });
            }

            const deleteSeries = req.query.scope === 'series';
            const result = await transactionService.deleteTransaction(transactionId, userId, deleteSeries);

            return res.status(200).json({
                message: result.deletedFutureIncome
                    ? 'Receita e lançamentos futuros excluídos com sucesso!'
                    : result.deletedSeries
                        ? 'Todas as parcelas foram excluídas com sucesso!'
                    : 'Transação excluída com sucesso!',
            });

        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getSummary(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }

            const month = req.query.month ? Number(req.query.month) : undefined;
            const year = req.query.year ? Number(req.query.year) : undefined;
            const summary = await transactionService.getTransactionSummary(userId, month, year);

            return res.status(200).json(summary);

        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}

import { Router } from 'express';
import { FinancialController } from '../controllers/financialController';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const controller = new FinancialController();
const resources = ['cards', 'accounts', 'categories', 'budgets', 'goals'] as const;

router.use(authMiddleware);

for (const resource of resources) {
  router.get(`/${resource}`, (req, res) => controller.list(resource, req as AuthRequest, res));
  router.post(`/${resource}`, (req, res) => controller.create(resource, req as AuthRequest, res));
  router.patch(`/${resource}/:id`, (req, res) => controller.update(resource, req as AuthRequest, res));
  router.delete(`/${resource}/:id`, (req, res) => controller.remove(resource, req as AuthRequest, res));
}

// Rota especial: pagar a fatura de um cartão por mês/ano inteiro
router.post('/cards/:id/pay', (req, res) => controller.payCardBill(req as AuthRequest, res));

router.get('/reports/monthly', (req, res) => controller.report(req as AuthRequest, res));

export default router;

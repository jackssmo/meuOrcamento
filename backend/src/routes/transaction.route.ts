import {Router} from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

router.use(authMiddleware);

router.post('/', (req, res) => transactionController.create(req, res));
router.get('/', (req, res) => transactionController.list(req, res));
router.get('/summary', (req, res) => transactionController.getSummary(req, res));
router.put('/:id', (req, res) => transactionController.update(req, res));
router.patch('/:id/payment', (req, res) => transactionController.updatePaymentStatus(req, res));
router.delete('/:id', (req, res) => transactionController.delete(req, res));

export default router;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/db';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.route';
import financialRoutes from './routes/financial.routes';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { errorMiddleware } from './middleware/error.middleware';

dotenv.config();

const app = express();
const allowedOrigins = new Set([env.frontendUrl]);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não permitida pelo CORS.'));
  },
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1500, standardHeaders: 'draft-7', legacyHeaders: false }));

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/financial', financialRoutes);

// The /api prefix is the public URL used by the frontend in production.
// Keep the unprefixed routes above for backwards compatibility.
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/financial', financialRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API do Meu Orcamento funcionando!' });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

app.listen(env.port, () => {
  console.log(`Servidor rodando em http://localhost:${env.port}`);
});
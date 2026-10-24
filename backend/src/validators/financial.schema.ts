import { z } from 'zod';

const money = z.number().finite().min(0);
const name = z.string().trim().min(2).max(120);

export const financialSchemas = {
  cards: z.object({
    name: name,
    credit_limit: money.optional().default(0),
  }),
  accounts: z.object({
    name,
    type: z.enum(['checking', 'cash', 'savings', 'credit_card']),
    initial_balance: money.optional(),
    credit_limit: money.nullable().optional(),
    closing_day: z.number().int().min(1).max(31).nullable().optional(),
    due_day: z.number().int().min(1).max(31).nullable().optional(),
  }),
  categories: z.object({
    name: z.string().trim().min(2).max(80),
    type: z.enum(['income', 'expense', 'both']),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  }),
  budgets: z.object({
    category: z.string().trim().min(1).max(80),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2200),
    amount: money,
  }),
  goals: z.object({
    name,
    target_amount: z.number().finite().positive(),
    current_amount: money.optional(),
    deadline: z.string().date().nullable().optional(),
  }),
} as const;

export type FinancialResource = keyof typeof financialSchemas;

import { describe, expect, it, vi } from 'vitest';
import { TransactionService } from './TransactionService';
import type { TransactionRepository } from '../repositories/TransactionRepository';
import type { Transaction } from '../models/Transaction';

describe('TransactionService.createTransaction', () => {
  it('splits total purchase amount across installments for expenses', async () => {
    const createMany = vi.fn(async (items: Transaction[]) => items);
    const repo = { createMany } as unknown as TransactionRepository;
    const service = new TransactionService(repo);

    await service.createTransaction(1, {
      description: 'Notebook',
      amount: 100,
      type: 'expense',
      category: 'compras',
      date: '2026-11-26',
      installments: 3,
      is_fixed: false,
      is_paid: false,
    });

    expect(createMany).toHaveBeenCalledTimes(1);
    const createdItems = createMany.mock.calls[0]?.[0] ?? [];
    expect(createdItems).toHaveLength(3);
    expect(createdItems.map((item) => item.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(createdItems.map((item) => item.description)).toEqual([
      'Notebook (1/3)',
      'Notebook (2/3)',
      'Notebook (3/3)',
    ]);
  });

  it('keeps the full monthly amount for fixed income across 12 months', async () => {
    const createMany = vi.fn(async (items: Transaction[]) => items);
    const repo = { createMany } as unknown as TransactionRepository;
    const service = new TransactionService(repo);

    await service.createTransaction(1, {
      description: 'Salário',
      amount: 3000,
      type: 'income',
      category: 'salario',
      date: '2026-11-26',
      is_fixed: true,
      is_paid: true,
    });

    const createdItems = createMany.mock.calls[0]?.[0] ?? [];
    expect(createdItems).toHaveLength(12);
    expect(createdItems.every((item) => item.amount === 3000)).toBe(true);
  });
});

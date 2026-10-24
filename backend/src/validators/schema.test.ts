import { describe, it, expect } from 'vitest';
import { transactionSchema } from './transaction.schema';
import { financialSchemas } from './financial.schema';

describe('Transaction Schema', () => {
  it('should accept valid transaction with is_paid true', () => {
    const data = {
      description: 'Supermercado',
      amount: 150.50,
      type: 'expense',
      category: 'alimentacao',
      date: '2026-10-23',
      card: 'Nubank',
      is_paid: true,
    };
    const parsed = transactionSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.is_paid).toBe(true);
    }
  });

  it('should default is_paid to false when not provided', () => {
    const data = {
      description: 'Supermercado',
      amount: 150.50,
      type: 'expense',
      category: 'alimentacao',
      date: '2026-10-23',
    };
    const parsed = transactionSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.is_paid).toBe(false);
    }
  });
});

describe('Financial Schemas - Cards', () => {
  it('should accept card with credit_limit', () => {
    const parsed = financialSchemas.cards.safeParse({
      name: 'Nubank Ultravioleta',
      credit_limit: 10000,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.credit_limit).toBe(10000);
    }
  });

  it('should default credit_limit to 0 when omitted', () => {
    const parsed = financialSchemas.cards.safeParse({
      name: 'Inter Mastercard',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.credit_limit).toBe(0);
    }
  });
});


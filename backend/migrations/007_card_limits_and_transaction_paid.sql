ALTER TABLE cards
  ADD COLUMN credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE transactions
  ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_transactions_user_card_paid ON transactions(user_id, card, is_paid);


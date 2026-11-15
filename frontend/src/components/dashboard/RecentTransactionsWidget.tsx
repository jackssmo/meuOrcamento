import { Link } from "react-router-dom";
import { ArrowLeftRight, CreditCard, Plus, Pencil } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { DEFAULT_CATEGORY_LABELS } from "../../constants/designSystem";
import { useFinancial } from "../../hooks/useFinancial";
import type { Transaction } from "../../types/models";

interface RecentTransactionsWidgetProps {
  transactions: Transaction[];
  onTogglePaid: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
}

export function RecentTransactionsWidget({
  transactions,
  onTogglePaid,
  onEdit,
}: RecentTransactionsWidgetProps) {
  const { openNewTransaction } = useFinancial();

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <ArrowLeftRight className="w-8 h-8 text-[#64756a] mx-auto opacity-70" />
        <p className="text-xs sm:text-sm text-[#64756a]">
          Nenhuma transação encontrada para este mês.
        </p>
        <button
          type="button"
          onClick={() => openNewTransaction("expense")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#236344] hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar primeiro lançamento</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {transactions.slice(0, 6).map((t) => {
        const isIncome = t.type === "income";
        const categoryLabel =
          DEFAULT_CATEGORY_LABELS[t.category.toLowerCase()] || t.category;

        return (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-[#e8e1d5] bg-white hover:bg-[#fbf9f4] transition-colors"
          >
            {/* Lado Esquerdo: Descrição, Categoria, Cartão e Data */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#1b2920] truncate">
                  {t.description}
                </span>

                {t.card && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f4efe6] text-[#4a554e] border border-[#ded7cb]">
                    <CreditCard className="w-3 h-3" />
                    <span>{t.card === "mercado_pago" ? "Mercado Pago" : t.card}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-[#64756a]">
                <span className="capitalize">{categoryLabel}</span>
                <span>•</span>
                <span>{formatDate(t.date)}</span>
              </div>
            </div>

            {/* Lado Direito: Valor e Ações de Status */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span
                  className={`block text-sm font-bold tabular-nums ${
                    isIncome ? "text-[#1b6e44]" : "text-[#b33a3a]"
                  }`}
                >
                  {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                </span>

                {/* Status Toggle Pill para Despesas */}
                {!isIncome && (
                  <button
                    type="button"
                    onClick={() => onTogglePaid(t)}
                    className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      t.is_paid
                        ? "bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0] hover:bg-[#e2f1e8]"
                        : "bg-[#fef7ee] text-[#b86214] border border-[#f5dfc6] hover:bg-[#fbf0e1]"
                    }`}
                    title={t.is_paid ? "Marcar como pendente" : "Marcar como paga"}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        t.is_paid ? "bg-[#1b6e44]" : "bg-[#b86214]"
                      }`}
                    />
                    <span>{t.is_paid ? "Paga" : "Pendente"}</span>
                  </button>
                )}
              </div>

              {/* Botão de Edição Rápida */}
              <button
                type="button"
                onClick={() => onEdit(t)}
                className="p-1.5 text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer"
                title="Editar transação"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      <div className="pt-2 text-center">
        <Link
          to="/transactions"
          className="inline-flex items-center justify-center text-xs font-bold text-[#236344] hover:underline"
        >
          Ver todas as transações do mês →
        </Link>
      </div>
    </div>
  );
}

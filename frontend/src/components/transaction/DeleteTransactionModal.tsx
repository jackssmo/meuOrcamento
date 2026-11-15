import { AlertCircle, Trash2, X } from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/formatters";
import type { Transaction } from "../../types/models";

interface DeleteTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (scope?: "series") => Promise<void>;
  isDeleting: boolean;
}

export function DeleteTransactionModal({
  isOpen,
  transaction,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteTransactionModalProps) {
  if (!isOpen || !transaction) return null;

  const isInstallmentExpense =
    transaction.type === "expense" &&
    !transaction.is_fixed &&
    (transaction.installments || 1) > 1;

  const isFixedIncome =
    transaction.type === "income" && Boolean(transaction.is_fixed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-[#fdf4f4] border border-[#f5cece] text-[#b33a3a] shrink-0">
              <Trash2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1b2920]">
                Excluir Lançamento
              </h3>
              <p className="text-xs text-[#64756a] mt-0.5">
                Esta ação removerá o registro financeiro.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Transação Selecionada */}
        <div className="p-3.5 rounded-xl bg-[#fbf9f4] border border-[#ded7cb] text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-[#1b2920]">
            <span className="truncate pr-2">{transaction.description}</span>
            <span
              className={`tabular-nums shrink-0 ${
                transaction.type === "income" ? "text-[#1b6e44]" : "text-[#b33a3a]"
              }`}
            >
              {transaction.type === "income" ? "+" : "-"} {formatCurrency(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#64756a]">
            <span className="capitalize">{transaction.category}</span>
            <span>{formatDate(transaction.date)}</span>
          </div>
          {transaction.card && (
            <p className="text-[11px] text-[#236344] font-medium pt-0.5">
              💳 Cartão: {transaction.card === "mercado_pago" ? "Mercado Pago" : transaction.card}
            </p>
          )}
        </div>

        {/* Caso 1: Despesa Parcelada */}
        {isInstallmentExpense && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#fef7ee] border border-[#f5dfc6] text-xs text-[#b86214]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Esta despesa faz parte de um parcelamento em {transaction.installments} parcelas. Como deseja excluir?
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm()}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#1b2920] bg-[#f4efe6] hover:bg-[#ede5d8] border border-[#ded7cb] rounded-xl transition-colors cursor-pointer text-left"
              >
                Excluir apenas esta parcela
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm("series")}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#b33a3a] hover:bg-[#962e2e] rounded-xl transition-colors cursor-pointer text-left shadow-xs"
              >
                Excluir todas as parcelas desta série
              </button>
            </div>
          </div>
        )}

        {/* Caso 2: Receita Fixa Recorrente */}
        {isFixedIncome && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#fef7ee] border border-[#f5dfc6] text-xs text-[#b86214]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Esta receita foi cadastrada como renda fixa mensal. Como deseja prosseguir?
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm()}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#1b2920] bg-[#f4efe6] hover:bg-[#ede5d8] border border-[#ded7cb] rounded-xl transition-colors cursor-pointer text-left"
              >
                Excluir apenas este mês
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm("series")}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#b33a3a] hover:bg-[#962e2e] rounded-xl transition-colors cursor-pointer text-left shadow-xs"
              >
                Excluir esta e todas as receitas futuras
              </button>
            </div>
          </div>
        )}

        {/* Caso 3: Lançamento Comum */}
        {!isInstallmentExpense && !isFixedIncome && (
          <div className="pt-2">
            <p className="text-xs text-[#64756a] leading-relaxed mb-4">
              Tem certeza que deseja apagar permanentemente este lançamento? O saldo e relatórios serão recalculados imediatamente.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void onConfirm()}
                className="btn-primary bg-[#b33a3a] hover:bg-[#962e2e] px-4 py-2.5 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        )}

        {/* Botão de Cancelar para os casos 1 e 2 */}
        {(isInstallmentExpense || isFixedIncome) && (
          <div className="pt-2 text-center border-t border-[#ede7dc]">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="text-xs font-semibold text-[#64756a] hover:text-[#1b2920] cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

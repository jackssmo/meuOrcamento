import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { api } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";
import { MONTH_NAMES } from "../../constants/designSystem";
import type { CardItem } from "../../types/models";

interface CreditCardsWidgetProps {
  cards: CardItem[];
  cardTotals: Record<string, number>;
  cardUnpaidTotals: Record<string, number>;
  selectedMonth: number;
  selectedYear: number;
  onRefresh: () => void;
}

export function CreditCardsWidget({
  cards,
  cardTotals,
  cardUnpaidTotals,
  selectedMonth,
  selectedYear,
  onRefresh,
}: CreditCardsWidgetProps) {
  const [payingCardId, setPayingCardId] = useState<number | null>(null);

  const monthName = MONTH_NAMES[selectedMonth - 1];

  async function handlePayBill(cardId: number, cardName: string) {
    if (!window.confirm(`Confirmar o pagamento total da fatura de ${monthName} do cartão ${cardName}? Todas as despesas pendentes deste mês serão quitadas e o limite será liberado.`)) {
      return;
    }

    setPayingCardId(cardId);
    try {
      await api.post(`/financial/cards/${cardId}/pay`, {
        month: selectedMonth,
        year: selectedYear,
      });
      toast.success(`Fatura de ${monthName} do cartão ${cardName} quitada com sucesso!`);
      onRefresh();
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Erro ao quitar fatura do cartão.");
      } else {
        toast.error("Erro inesperado ao pagar fatura.");
      }
    } finally {
      setPayingCardId(null);
    }
  }

  if (cards.length === 0) {
    return (
      <div className="py-10 text-center space-y-3">
        <CreditCard className="w-8 h-8 text-[#64756a] mx-auto opacity-70" />
        <p className="text-xs sm:text-sm text-[#64756a]">
          Nenhum cartão cadastrado ainda.
        </p>
        <Link
          to="/planning"
          className="inline-flex text-xs font-bold text-[#236344] hover:underline"
        >
          Cadastrar cartão em Planejamento →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cards.map((c) => {
        const limit = Number(c.credit_limit) || 0;
        const used = Number(c.used_limit) || 0;
        const available = Number(c.available_limit) || Math.max(0, limit - used);
        const usagePercentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const isOverLimit = limit > 0 && used > limit;

        const monthSpent = cardTotals[c.name] || 0;
        const monthUnpaid = cardUnpaidTotals[c.name] || 0;
        const isBillPaid = monthSpent > 0 && monthUnpaid === 0;

        return (
          <div
            key={c.id}
            className="p-4 rounded-xl border border-[#e8e1d5] bg-[#fbf9f4] space-y-3 shadow-2xs"
          >
            {/* Topo do Cartão: Nome + Fatura do Mês */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-white border border-[#ded7cb] text-[#236344]">
                  <CreditCard className="w-4 h-4" />
                </span>
                <span className="text-sm font-bold text-[#1b2920]">{c.name}</span>
              </div>
              {monthSpent > 0 && (
                <span className="text-xs font-semibold text-[#64756a] tabular-nums">
                  Fatura: {formatCurrency(monthSpent)}
                </span>
              )}
            </div>

            {/* Informações de Limite (se houver limite configurado) */}
            {limit > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white border border-[#e8e1d5] text-[11px] tabular-nums">
                  <div>
                    <span className="block text-[#64756a] font-medium">Limite</span>
                    <strong className="text-[#1b2920] font-bold">{formatCurrency(limit)}</strong>
                  </div>
                  <div>
                    <span className="block text-[#64756a] font-medium">Usado</span>
                    <strong className={`font-bold ${isOverLimit ? "text-[#b33a3a]" : "text-[#b86214]"}`}>
                      {formatCurrency(used)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[#64756a] font-medium">Disponível</span>
                    <strong className={`font-bold ${available < 0 ? "text-[#b33a3a]" : "text-[#1b6e44]"}`}>
                      {formatCurrency(available)}
                    </strong>
                  </div>
                </div>

                {/* Barra de Progresso com Indicador de Estouro */}
                <div>
                  <div className="flex justify-between text-[11px] text-[#64756a] mb-1 font-medium">
                    <span>{usagePercentage}% do limite em uso</span>
                    {isOverLimit && (
                      <span className="inline-flex items-center gap-1 font-bold text-[#b33a3a]">
                        <AlertCircle className="w-3 h-3" />
                        Limite estourado!
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full bg-[#ede7dc] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverLimit
                          ? "bg-[#b33a3a]"
                          : usagePercentage >= 80
                          ? "bg-[#b86214]"
                          : "bg-[#236344]"
                      }`}
                      style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-xs text-[#64756a] bg-white p-2.5 rounded-lg border border-[#e8e1d5]">
                <span>Limite não cadastrado</span>
                <Link to="/planning" className="text-[#236344] font-bold hover:underline">
                  Configurar limite
                </Link>
              </div>
            )}

            {/* Ação de Quitação da Fatura do Mês */}
            {monthSpent > 0 && (
              <div className="pt-1">
                {isBillPaid ? (
                  <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#eef7f2] border border-[#c2ded0] text-xs font-bold text-[#1b6e44]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fatura de {monthName} quitada</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePayBill(c.id, c.name)}
                    disabled={payingCardId === c.id}
                    className="w-full py-2 px-3 text-xs font-semibold text-[#236344] hover:text-white bg-white hover:bg-[#236344] border border-[#236344] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {payingCardId === c.id ? (
                      "Quitando fatura..."
                    ) : (
                      `Pagar fatura de ${monthName} (${formatCurrency(monthUnpaid)})`
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2 text-right">
        <Link
          to="/planning"
          className="text-xs font-semibold text-[#236344] hover:underline"
        >
          Gerenciar todos os cartões →
        </Link>
      </div>
    </div>
  );
}

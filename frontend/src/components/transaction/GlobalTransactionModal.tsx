import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { X, Check, ArrowDownLeft, ArrowUpRight, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { api } from "../../services/api";
import { useFinancial } from "../../hooks/useFinancial";
import { formatCurrency, formatCurrencyInput, splitAmountInCents } from "../../utils/formatters";
import type { CardItem, Category, TransactionType } from "../../types/models";

function getTodayInputValue(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function capitalizeWords(value: string): string {
  return value.replace(/(^|\s)(\S)/gu, (_, separator: string, character: string) =>
    `${separator}${character.toLocaleUpperCase("pt-BR")}`
  );
}

export function GlobalTransactionModal() {
  const {
    isTransactionModalOpen,
    closeTransactionModal,
    editingTransaction,
    defaultTransactionType,
    triggerRefresh,
  } = useFinancial();

  const [type, setType] = useState<TransactionType>(defaultTransactionType);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayInputValue);
  const [category, setCategory] = useState("");
  const [card, setCard] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const [installments, setInstallments] = useState("1");
  const [isPaid, setIsPaid] = useState(false);

  const [cardsList, setCardsList] = useState<CardItem[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditScopeModal, setShowEditScopeModal] = useState(false);

  // Carregar cartões e categorias disponíveis
  useEffect(() => {
    if (!isTransactionModalOpen) return;

    api.get<CardItem[]>("/financial/cards")
      .then((res) => setCardsList(res.data))
      .catch((err) => console.error("Erro ao buscar cartões:", err));

    api.get<Category[]>("/financial/categories")
      .then((res) => setCustomCategories(res.data))
      .catch((err) => console.error("Erro ao buscar categorias:", err));
  }, [isTransactionModalOpen]);

  // Sincronizar dados quando o modal abre (para criar novo ou editar)
  useEffect(() => {
    if (!isTransactionModalOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(formatCurrencyInput((editingTransaction.amount * 100).toFixed(0)));
      setDate(editingTransaction.date ? editingTransaction.date.split("T")[0] : getTodayInputValue());
      setCategory(editingTransaction.category || "");
      setCard(editingTransaction.card || "");
      setIsFixed(Boolean(editingTransaction.is_fixed));
      setInstallments(String(editingTransaction.installments || 1));
      setIsPaid(Boolean(editingTransaction.is_paid));
    } else {
      setType(defaultTransactionType);
      setDescription("");
      setAmount("");
      setDate(getTodayInputValue());
      setCategory("");
      setCard("");
      setIsFixed(false);
      setInstallments("1");
      setIsPaid(false);
    }
    setShowEditScopeModal(false);
  }, [isTransactionModalOpen, editingTransaction, defaultTransactionType]);

  if (!isTransactionModalOpen) return null;

  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    setAmount(formatCurrencyInput(e.target.value));
  }

  async function executeSubmit(isSeries = false) {
    const rawDigits = amount.replace(/\D/g, "");
    const numericAmount = rawDigits ? Number(rawDigits) / 100 : 0;

    if (numericAmount <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    if (!description.trim()) {
      toast.error("Informe a descrição da transação.");
      return;
    }

    if (!category) {
      toast.error("Selecione uma categoria.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        const query = isSeries ? "?scope=series" : "";
        await api.put(`/transactions/${editingTransaction.id}${query}`, {
          description,
          amount: numericAmount,
          date,
          type,
          category,
          card: type === "expense" ? card || null : null,
          is_paid: type === "expense" ? isPaid : true,
        });
        toast.success(isSeries ? "Série de parcelas atualizada!" : "Transação atualizada com sucesso!");
      } else {
        await api.post("/transactions", {
          description,
          amount: numericAmount,
          date,
          type,
          category,
          card: type === "expense" ? card || null : null,
          is_fixed: type === "income" ? isFixed : false,
          installments: type === "expense" ? Number(installments) || 1 : 1,
          is_paid: type === "expense" ? isPaid : true,
        });
        toast.success("Transação adicionada com sucesso!");
      }

      triggerRefresh();
      closeTransactionModal();
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Erro ao salvar transação.");
      } else {
        toast.error("Erro inesperado ao salvar.");
      }
    } finally {
      setIsSubmitting(false);
      setShowEditScopeModal(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Se estiver editando uma parcela de uma série, pergunta o escopo
    if (editingTransaction && editingTransaction.type === "expense" && (editingTransaction.installments || 1) > 1) {
      setShowEditScopeModal(true);
      return;
    }

    void executeSubmit(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e8e1d5] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e1d5] bg-[#fbf9f4]">
          <div>
            <h2 className="text-lg font-bold text-[#1b2920]">
              {editingTransaction ? "Editar Transação" : "Nova Transação"}
            </h2>
            <p className="text-xs text-[#64756a] mt-0.5">
              {editingTransaction ? "Altere os dados do lançamento." : "Registre uma receita ou despesa."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTransactionModal}
            className="p-1.5 text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll se necessário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Seletor Tipo: Receita vs Despesa */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-2">
              Tipo de Lançamento
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCard("");
                  setIsPaid(true);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                  type === "income"
                    ? "bg-[#eef7f2] text-[#1b6e44] border-[#c2ded0] shadow-xs"
                    : "bg-[#f4efe6] text-[#64756a] border-transparent hover:bg-[#ede5d8]"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Receita</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setIsFixed(false);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                  type === "expense"
                    ? "bg-[#fdf4f4] text-[#b33a3a] border-[#f5cece] shadow-xs"
                    : "bg-[#f4efe6] text-[#64756a] border-transparent hover:bg-[#ede5d8]"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Despesa</span>
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(capitalizeWords(e.target.value))}
              placeholder="Ex.: Supermercado, Aluguel, Salário..."
              className="bespoke-input text-sm"
              autoFocus={!editingTransaction}
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                {type === "expense" && !editingTransaction && Number(installments) > 1
                  ? "Valor total da compra (R$)"
                  : "Valor (R$)"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64756a] pointer-events-none select-none">
                  R$
                </span>
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0,00"
                  className="bespoke-input pl-11 text-sm font-bold tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                Data
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bespoke-input text-sm"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
              Categoria
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bespoke-input text-sm bg-white"
            >
              <option value="" disabled>Selecione uma categoria...</option>
              <option value="alimentacao">Alimentação</option>
              <option value="moradia">Moradia</option>
              <option value="transporte">Transporte</option>
              <option value="salario">Salário</option>
              <option value="lazer">Lazer</option>
              <option value="saude">Saúde</option>
              <option value="educacao">Educação</option>
              <option value="assinaturas">Assinaturas</option>
              <option value="compras">Compras</option>
              <option value="viagens">Viagens</option>
              <option value="impostos">Impostos e taxas</option>
              <option value="investimentos">Investimentos</option>
              <option value="dividas">Dívidas</option>
              <option value="outros">Outros</option>
              {customCategories
                .filter(
                  (c) =>
                    !["alimentacao", "moradia", "transporte", "salario", "lazer", "saude", "educacao", "assinaturas", "compras", "viagens", "impostos", "investimentos", "dividas", "outros"].includes(c.name.toLowerCase())
                )
                .map((c) => (
                  <option key={c.id} value={c.name.toLowerCase()}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Cartão de Crédito (Apenas para despesas) */}
          {type === "expense" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#236344]" />
                <span>Cartão de Crédito (Opcional)</span>
              </label>
              <select
                value={card}
                onChange={(e) => setCard(e.target.value)}
                className="bespoke-input text-sm bg-white"
              >
                <option value="">Nenhum (pago via saldo / conta corrente)</option>
                {cardsList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status de Pagamento (apenas para despesas) */}
          {type === "expense" && (
            <div className="p-3.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4]">
              <label htmlFor="modal-is-paid" className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="modal-is-paid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#ded7cb] text-[#236344] focus:ring-[#236344] accent-[#236344] cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-bold text-[#1b2920]">
                    Despesa já quitada?
                  </span>
                  <span className="block text-[11px] text-[#64756a] mt-0.5 leading-relaxed">
                    Despesas pagas debitam do saldo e liberam o limite comprometido do cartão.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Receita Fixa Recorrente */}
          {!editingTransaction && type === "income" && (
            <div className="p-3.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4]">
              <label htmlFor="modal-is-fixed" className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="modal-is-fixed"
                  checked={isFixed}
                  onChange={(e) => setIsFixed(e.target.checked)}
                  className="h-4 w-4 rounded border-[#ded7cb] text-[#236344] focus:ring-[#236344] accent-[#236344] cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-bold text-[#1b2920]">
                    Renda Fixa Mensal (Gerar para 12 meses)
                  </span>
                  <span className="block text-[11px] text-[#64756a] mt-0.5">
                    Projeta automaticamente o recebimento deste valor para todo o ano.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Parcelamento de Despesa */}
          {!editingTransaction && type === "expense" && (() => {
            const rawDigits = amount.replace(/\D/g, "");
            const numericAmount = rawDigits ? Number(rawDigits) / 100 : 0;
            const parsedInstallments = Math.min(60, Math.max(1, Math.floor(Number(installments) || 1)));
            const isInstallment = parsedInstallments > 1;
            const installmentCents = isInstallment && numericAmount > 0
              ? splitAmountInCents(numericAmount, parsedInstallments)
              : [];
            const firstCents = installmentCents[0] ?? 0;
            const lastCents = installmentCents[installmentCents.length - 1] ?? 0;
            const hasRemainder = firstCents !== lastCents;
            const higherCount = installmentCents.filter((c) => c === firstCents).length;
            const lowerCount = parsedInstallments - higherCount;

            return (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                    Número de Parcelas
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="bespoke-input w-28 text-sm tabular-nums"
                    />
                    <span className="text-xs text-[#64756a]">
                      {isInstallment
                        ? numericAmount > 0
                          ? hasRemainder
                            ? `${higherCount}x de ${formatCurrency(firstCents / 100)} + ${lowerCount}x de ${formatCurrency(lastCents / 100)}`
                            : `${parsedInstallments}x mensais de ${formatCurrency(firstCents / 100)}`
                          : "Informe o valor total da compra para ver a prévia das parcelas."
                        : "Lançamento à vista em parcela única."}
                    </span>
                  </div>
                </div>

                {isInstallment && numericAmount > 0 && (
                  <div className="p-3.5 rounded-xl border border-[#ded7cb] bg-[#fbf9f4] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1b2920]">
                        Prévia das parcelas ({parsedInstallments}x)
                      </span>
                      <span className="font-semibold text-[#64756a] tabular-nums">
                        Total: {formatCurrency(numericAmount)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {installmentCents.map((cents, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e1d5] text-xs tabular-nums"
                        >
                          <span className="font-semibold text-[#64756a]">
                            {index + 1}/{parsedInstallments}
                          </span>
                          <span className="font-bold text-[#1b2920]">
                            {formatCurrency(cents / 100)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Ações do Rodapé */}
          <div className="pt-3 border-t border-[#ede7dc] flex items-center gap-3">
            <button
              type="button"
              onClick={closeTransactionModal}
              className="px-4 py-2.5 text-xs font-semibold text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 sm:flex-none px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>Salvando...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingTransaction ? "Salvar Alterações" : "Confirmar Lançamento"}</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Submodal de Escopo de Edição para Séries Parceladas */}
      {showEditScopeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-100">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <h3 className="text-base font-bold text-[#1b2920]">
              Atualizar Despesa Parcelada
            </h3>
            <p className="text-xs text-[#64756a] leading-relaxed">
              Esta transação pertence a um parcelamento. Como deseja aplicar a alteração?
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => void executeSubmit(false)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#1b2920] bg-[#f4efe6] hover:bg-[#ede5d8] border border-[#ded7cb] rounded-xl transition-colors cursor-pointer text-left"
              >
                Atualizar apenas esta parcela
              </button>
              <button
                type="button"
                onClick={() => void executeSubmit(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#236344] hover:bg-[#1a4e35] rounded-xl transition-colors cursor-pointer text-left shadow-xs"
              >
                Atualizar esta e as próximas parcelas
              </button>
              <button
                type="button"
                onClick={() => setShowEditScopeModal(false)}
                className="w-full py-2 text-xs font-semibold text-[#64756a] hover:text-[#1b2920] cursor-pointer text-center"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

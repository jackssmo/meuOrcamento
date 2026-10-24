import { useCallback, useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Header } from "../components/Header";
import { SummaryCards } from "../components/SummaryCards";
import { TransactionTable } from "../components/TransactionTable";
import { TransactionModal } from "../components/TransactionModal";
import type { Transaction, CardItem } from "../types/Transaction";
import { formatCurrency } from "../utils/formatters";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { useAuth } from "../contexts/AuthContext";

function getTodayInputValue(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

const categoryLabels: Record<string, string> = {
  alimentacao: "Alimentação",
  moradia: "Moradia",
  transporte: "Transporte",
  salario: "Salário",
  lazer: "Lazer",
  saude: "Saúde",
  educacao: "Educação",
  assinaturas: "Assinaturas",
  compras: "Compras",
  viagens: "Viagens",
  impostos: "Impostos e taxas",
  investimentos: "Investimentos",
  dividas: "Dívidas",
  outros: "Outros",
};

const categoryColors = ["#2454a6", "#4f82d1", "#73b49a", "#e0ae4f", "#de6b67", "#8c72b2", "#5aa6ae", "#9aabbc"];
const categoryColorMap: Record<string, string> = {
  alimentacao: "#2454a6",
  moradia: "#4f82d1",
  transporte: "#73b49a",
  salario: "#e0ae4f",
  lazer: "#de6b67",
  saude: "#8c72b2",
  educacao: "#5aa6ae",
  assinaturas: "#9aabbc",
  compras: "#d4773f",
  viagens: "#bd6c9b",
  impostos: "#63738a",
  investimentos: "#2d8a70",
  dividas: "#b04d58",
  outros: "#8b8f98",
};
const monthLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getCategoryColor(category: string): string {
  const normalizedCategory = category.toLowerCase().trim();
  const mappedColor = categoryColorMap[normalizedCategory];
  if (mappedColor) return mappedColor;

  let hash = 0;
  for (let index = 0; index < normalizedCategory.length; index += 1) {
    hash = (hash * 31 + normalizedCategory.charCodeAt(index)) >>> 0;
  }
  return categoryColors[hash % categoryColors.length];
}

function getCardColor(card: string): string {
  const colors = ["#2454a6", "#4f82d1", "#73b49a", "#e0ae4f", "#de6b67", "#8c72b2", "#5aa6ae"];
  let hash = 0;
  for (let index = 0; index < card.length; index += 1) {
    hash = (hash * 31 + card.charCodeAt(index)) >>> 0;
  }
  return colors[hash % colors.length];
}

export function Dashboard() {
  const { user } = useAuth();
  const userName = user?.name || "Usuário";
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [card, setCard] = useState("");
  const [cards, setCards] = useState<string[]>([]);
  const [cardsList, setCardsList] = useState<CardItem[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [date, setDate] = useState(getTodayInputValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showEditScope, setShowEditScope] = useState(false);

  const [isFixed, setIsFixed] = useState(false);
  const [installments, setInstallments] = useState("1");

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [onlyType, setOnlyType] = useState<"all" | "income" | "expense">("all");
  const [monthlyHistory, setMonthlyHistory] = useState<{ month: number; income: number; expense: number }[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0, realizedBalance: 0 });
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [cardTotals, setCardTotals] = useState<Record<string, number>>({});

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await api.get("/transactions", {
        params: { month: selectedMonth, year: selectedYear, search, type: onlyType === "all" ? undefined : onlyType, page, pageSize: 20 },
      });
      setTransactions(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar transações.");
    }
  }, [selectedMonth, selectedYear, search, onlyType, page]);

  const refreshFinancialData = useCallback(async () => {
    const [summaryResponse, historyResponse, categoryResponse, cardsResponse] = await Promise.all([
      api.get("/transactions/summary", { params: { month: selectedMonth, year: selectedYear } }),
      api.get("/financial/reports/monthly", { params: { year: selectedYear } }),
      api.get("/financial/reports/monthly", { params: { month: selectedMonth, year: selectedYear } }),
      api.get("/financial/cards"),
    ]);

    setSummary(summaryResponse.data);
    setMonthlyHistory(historyResponse.data.monthly);
    setCategoryTotals(
      categoryResponse.data.byCategory
        .filter((item: { type: string }) => item.type === "expense")
        .reduce((result: Record<string, number>, item: { category: string; total: number }) => {
          result[item.category] = Number(item.total);
          return result;
        }, {}),
    );
    setCardTotals(
      (categoryResponse.data.byCard || []).reduce(
        (result: Record<string, number>, item: { card: string; total: number }) => {
          result[item.card] = Number(item.total);
          return result;
        },
        {},
      ),
    );
    setCardsList(cardsResponse.data || []);
    setCards((cardsResponse.data || []).map((item: CardItem) => item.name));
  }, [selectedMonth, selectedYear]);

  const cardTotal = Object.values(cardTotals).reduce((total, value) => total + value, 0);

  useEffect(() => {
    void Promise.resolve().then(fetchTransactions);
    void Promise.resolve().then(refreshFinancialData).catch(() => {
      setSummary({ totalIncome: 0, totalExpense: 0, balance: 0, realizedBalance: 0 });
      setMonthlyHistory([]);
      setCategoryTotals({});
      setCardTotals({});
      setCardsList([]);
      setCards([]);
    });
    api.get("/financial/categories")
      .then((response) => setCustomCategories(response.data.map((item: { name: string }) => item.name)))
      .catch(() => setCustomCategories([]));
  }, [fetchTransactions, refreshFinancialData]);

  function closeModal() {
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("");
    setCard("");
    setDate(getTodayInputValue());
    setIsFixed(false);
    setInstallments("1");
    setIsPaid(false);
    setEditingId(null);
    setEditingTransaction(null);
    setShowEditScope(false);
    setIsModalOpen(false);
  }

  function handleEditClick(transaction: Transaction) {
    setDescription(transaction.description);
    const formattedAmount = Number(transaction.amount)
      .toFixed(2)
      .replace(".", ",")
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setAmount(formattedAmount);
    setType(transaction.type);
    setCategory(transaction.category);
    setCard(transaction.card || "");
    setDate(String(transaction.date).substring(0, 10));
    setIsPaid(Boolean(transaction.is_paid));
    setEditingId(transaction.id || null);
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  }

  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "");
    if (value === "") {
      setAmount("");
      return;
    }
    const numericValue = (Number(value) / 100).toFixed(2);
    const formattedValue = numericValue
      .replace(".", ",")
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    setAmount(formattedValue);
  }

  async function handleSubmitTransaction(e: FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount.replace(/\./g, "").replace(",", "."));
    const isInstallmentExpense =
      Boolean(editingTransaction?.id) &&
      editingTransaction?.type === "expense" &&
      !editingTransaction.is_fixed &&
      (editingTransaction.installments || 1) > 1;

    if (isInstallmentExpense) {
      setShowEditScope(true);
      return;
    }

    await submitTransaction(numericAmount, false);
  }

  async function submitTransaction(numericAmount: number, updateSeries: boolean) {
    setIsSubmitting(true);
    try {
      const data = {
        description,
        amount: numericAmount,
        type,
        category,
        card: type === "expense" && card ? card : null,
        is_paid: type === "expense" ? isPaid : false,
        date,
        is_fixed: isFixed,
        installments: Number(installments),
      };

      if (editingId) {
        const scope = updateSeries ? "?scope=series" : "";
        await api.put(`/transactions/${editingId}${scope}`, {
          description,
          amount: numericAmount,
          type,
          category,
          date,
          card: type === "expense" && card ? card : null,
          is_paid: type === "expense" ? isPaid : false,
        });
        toast.success("Transação atualizada com sucesso!");
      } else {
        await api.post("/transactions", data);
        toast.success("Nova transação salva!");
      }

      closeModal();
      setShowEditScope(false);
      await Promise.all([fetchTransactions(), refreshFinancialData()]);
    } catch (error) {
      console.error(error);
      const message = isAxiosError(error)
        ? error.response?.data?.error || error.response?.data?.message
        : undefined;
      toast.error(message || "Erro ao salvar transação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayCardBill(cardId: number, cardName: string) {
    const monthLabel = monthLabels[selectedMonth - 1];
    if (!window.confirm(`Confirma o pagamento da fatura de "${cardName}" referente a ${monthLabel} de ${selectedYear}?\n\nTodas as despesas pendentes deste cartão neste mês serão marcadas como pagas e o limite será liberado.`)) return;
    try {
      const response = await api.post(`/financial/cards/${cardId}/pay`, {
        month: selectedMonth,
        year: selectedYear,
      });
      const data = response.data as { message: string; updated: number; totalAmount: number };
      toast.success(data.message);
      await Promise.all([fetchTransactions(), refreshFinancialData()]);
    } catch (error) {
      console.error(error);
      const message = isAxiosError(error) ? error.response?.data?.error : undefined;
      toast.error(message || "Erro ao pagar fatura.");
    }
  }

  function handleDelete(transaction: Transaction) {
    setTransactionToDelete(transaction);
  }

  async function confirmDelete(scope: "single" | "series") {
    const transaction = transactionToDelete;
    if (!transaction?.id) return;

    const queryScope = scope === "series" ? "?scope=series" : "";

    try {
      const response = await api.delete(`/transactions/${transaction.id}${queryScope}`);
      await Promise.all([fetchTransactions(), refreshFinancialData()]);
      toast.success(response.data.message || "Transação apagada com sucesso!");
      setTransactionToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao apagar transação.");
    }
  }

  const filteredTransactions = transactions;

  const income = Number(summary.totalIncome);
  const expense = Number(summary.totalExpense);
  const balance = Number(summary.balance);

  const expensesByCategory = categoryTotals;
  const categoryEntries = Object.entries(expensesByCategory).sort(([, first], [, second]) => second - first);
  const categoryTotal = categoryEntries.reduce((total, [, value]) => total + value, 0);
  let categoryOffset = 0;
  const categoryGradient = categoryEntries.length > 0
    ? categoryEntries.map(([, value], index) => {
      const start = categoryOffset;
      categoryOffset += (value / categoryTotal) * 100;
      return `${getCategoryColor(categoryEntries[index][0])} ${start}% ${categoryOffset}%`;
    }).join(", ")
    : "#e8edf3 0% 100%";

  return (
    <div className="app-layout">
      <Header userName={userName} />

      <main className="app-content space-y-8">
        {/* Barra de Filtro de Mês/Ano */}
        <div className="page-heading">
          <div>
            <h1>Olá, {userName || "bem-vindo"}</h1>
            <p>Acompanhe o que está acontecendo com o seu dinheiro.</p>
            <div className="selected-period mt-4">
              <span className="selected-period-label">Período selecionado</span>
              <strong>{monthLabels[selectedMonth - 1]} de {selectedYear}</strong>
            </div>
          </div>
          <div className="flex space-x-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Evolução anual: também funciona como seletor de mês. */}
        <div className="surface p-5">
          <div className="section-title">
            <h2>Evolução do ano</h2>
            <span>Toque em um mês para selecionar</span>
          </div>
          <div className="flex h-20 items-end gap-2">
            {Array.from({ length: 12 }, (_, index) => {
              const item = monthlyHistory.find((month) => month.month === index + 1);
              const value = Number(item?.income || 0) + Number(item?.expense || 0);
              const max = Math.max(...monthlyHistory.map((month) => Number(month.income) + Number(month.expense)), 1);
              const month = index + 1;
              const isSelected = selectedMonth === month;
              return (
                <button
                  key={month}
                  type="button"
                  title={`Selecionar ${monthLabels[index]}: ${formatCurrency(value)}`}
                  aria-label={`Selecionar ${monthLabels[index]}`}
                  onClick={() => {
                    setSelectedMonth(month);
                    setPage(1);
                  }}
                  className={`flex-1 rounded-t transition ${isSelected ? "bg-[#2454a6]" : "bg-[#8bb9a5] hover:bg-[#2454a6]"}`}
                  style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
                />
              );
            })}
          </div>
          <div className="month-picker" aria-label="Selecionar mês">
            {monthLabels.map((month, index) => (
              <button
                key={month}
                type="button"
                className={selectedMonth === index + 1 ? "month-picker-button active" : "month-picker-button"}
                onClick={() => {
                  setSelectedMonth(index + 1);
                  setPage(1);
                }}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Cards de resumo */}
        <SummaryCards income={income} expense={expense} balance={balance} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <TransactionTable
              transactions={filteredTransactions}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onOpenModal={() => setIsModalOpen(true)}
              search={search}
              onSearchChange={setSearch}
              onlyType={onlyType}
              onTypeChange={setOnlyType}
            />
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between px-2 text-sm text-slate-500">
                <span>Página {page} de {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Anterior</button>
                  <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40">Próxima</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Gastos por categoria */}
            <section className="surface p-6 h-fit">
              <div className="section-title">
                <h2>Gastos por categoria</h2>
                <span>{formatCurrency(categoryTotal)}</span>
              </div>
              {expense === 0 ? (
                <p className="text-sm text-center text-gray-500">Sem despesas neste mês</p>
              ) : (
                <div>
                  <div className="flex justify-center py-2">
                    <div
                      className="relative grid h-40 w-40 place-items-center rounded-full"
                      style={{ background: `conic-gradient(${categoryGradient})` }}
                      aria-label="Distribuição das despesas por categoria"
                    >
                      <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Despesas</span>
                        <strong className="text-sm text-slate-700">{formatCurrency(categoryTotal)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {categoryEntries.map(([cat, val]) => {
                      const percentage = Math.round((val / categoryTotal) * 100);
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2 font-medium text-gray-700">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getCategoryColor(cat) }} />
                              {categoryLabels[cat] || cat}
                            </span>
                            <span className="text-gray-500">{formatCurrency(val)} <span className="text-xs">({percentage}%)</span></span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full"
                              style={{ width: `${percentage}%`, backgroundColor: getCategoryColor(cat) }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Cartões de crédito e limites */}
            <section className="surface p-6 h-fit">
              <div className="section-title">
                <h2>Cartões e Limites</h2>
                <div className="flex items-center gap-3">
                  {cardTotal > 0 && (
                    <span className="text-xs font-medium text-slate-500">
                      Mês: {formatCurrency(cardTotal)}
                    </span>
                  )}
                  <Link
                    to="/profile"
                    className="text-xs font-semibold text-[#2454a6] hover:underline"
                  >
                    Gerenciar
                  </Link>
                </div>
              </div>

              {cardsList.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  <p>Nenhum cartão cadastrado.</p>
                  <Link
                    to="/profile"
                    className="mt-2 inline-block font-semibold text-[#2454a6] hover:underline"
                  >
                    Cadastrar cartão no Perfil
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cardsList.map((c) => {
                    const limit = Number(c.credit_limit) || 0;
                    const used = Number(c.used_limit) || 0;
                    const available = Number(c.available_limit) || (limit - used);
                    const usagePercentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
                    const isOverLimit = limit > 0 && used > limit;
                    const monthSpent = cardTotals[c.name] || 0;
                    // fatura quitada quando não há despesas pendentes no mês
                    const billAlreadyPaid = monthSpent > 0 && used === 0;

                    return (
                      <div
                        key={c.id}
                        className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2"
                      >
                        {/* Cabeçalho: nome + gasto do mês */}
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: getCardColor(c.name) }}
                            />
                            {c.name}
                          </span>
                          {monthSpent > 0 && (
                            <span className="text-xs font-normal text-slate-500">
                              Fatura: {formatCurrency(monthSpent)}
                            </span>
                          )}
                        </div>

                        {/* Indicadores de limite (se configurado) */}
                        {limit > 0 ? (
                          <>
                            <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                              <div>
                                <span className="block text-slate-400">Limite</span>
                                <strong className="text-slate-700">{formatCurrency(limit)}</strong>
                              </div>
                              <div>
                                <span className="block text-slate-400">Usado</span>
                                <strong className={isOverLimit ? "text-red-600" : "text-amber-600"}>
                                  {formatCurrency(used)}
                                </strong>
                              </div>
                              <div>
                                <span className="block text-slate-400">Disponível</span>
                                <strong className={available < 0 ? "text-red-600" : "text-emerald-600"}>
                                  {formatCurrency(available)}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                                <span>{usagePercentage}% do limite utilizado</span>
                                {isOverLimit && <span className="text-red-600 font-bold">Estourado!</span>}
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOverLimit
                                      ? "bg-red-600"
                                      : usagePercentage >= 80
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 flex justify-between items-center">
                            <span>Limite não configurado</span>
                            <Link to="/profile" className="text-[#2454a6] font-semibold hover:underline">
                              Definir limite
                            </Link>
                          </div>
                        )}

                        {/* Botão Pagar Fatura */}
                        {monthSpent > 0 && (
                          billAlreadyPaid ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                              <span>✓</span>
                              Fatura de {monthLabels[selectedMonth - 1]} paga!
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handlePayCardBill(c.id, c.name)}
                              className="w-full rounded-lg border border-[#2454a6] bg-white px-3 py-2 text-xs font-semibold text-[#2454a6] transition hover:bg-[#2454a6] hover:text-white"
                            >
                              💳 Pagar fatura de {monthLabels[selectedMonth - 1]}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}

                  <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
                    💡 Clique em <span className="font-semibold text-[#2454a6]">Pagar fatura</span> para quitar todas as despesas pendentes do cartão no mês selecionado de uma vez, liberando o limite.
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-800">Excluir transação</h2>
            <p className="mt-2 text-sm text-slate-600">
              {transactionToDelete.description}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Escolha exatamente o que deseja apagar:
            </p>

            <div className="mt-5 space-y-3">
              {transactionToDelete.type === "expense" &&
                !transactionToDelete.is_fixed &&
                (transactionToDelete.installments || 1) > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => void confirmDelete("single")}
                      className="w-full rounded-lg border border-red-200 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Excluir apenas esta parcela
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmDelete("series")}
                      className="w-full rounded-lg bg-red-600 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Excluir todas as parcelas
                    </button>
                  </>
                )}

              {transactionToDelete.type === "income" && Boolean(transactionToDelete.is_fixed) && (
                <>
                  <button
                    type="button"
                    onClick={() => void confirmDelete("single")}
                    className="w-full rounded-lg border border-red-200 px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Excluir apenas este mês
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete("series")}
                    className="w-full rounded-lg bg-red-600 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Excluir deste mês em diante
                  </button>
                </>
              )}

              {(!transactionToDelete.installments || transactionToDelete.installments <= 1) &&
                !transactionToDelete.is_fixed && (
                  <button
                    type="button"
                    onClick={() => void confirmDelete("single")}
                    className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Confirmar exclusão
                  </button>
                )}

              <button
                type="button"
                onClick={() => setTransactionToDelete(null)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditScope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-800">Atualizar parcelamento</h2>
            <p className="mt-2 text-sm text-slate-600">
              Esta é uma despesa parcelada. Como deseja aplicar a alteração?
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  const numericAmount = Number(amount.replace(/\./g, "").replace(",", "."));
                  void submitTransaction(numericAmount, false);
                }}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Atualizar apenas esta parcela
              </button>
              <button
                type="button"
                onClick={() => {
                  const numericAmount = Number(amount.replace(/\./g, "").replace(",", "."));
                  void submitTransaction(numericAmount, true);
                }}
                className="w-full rounded-lg bg-[#2454a6] px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#1c4386]"
              >
                Editar esta e as próximas parcelas
              </button>
              <button
                type="button"
                onClick={() => setShowEditScope(false)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmitTransaction}
        isSubmitting={isSubmitting}
        editingId={editingId}
        type={type}
        setType={setType}
        description={description}
        setDescription={setDescription}
        amount={amount}
        onAmountChange={handleAmountChange}
        date={date}
        setDate={setDate}
        category={category}
        setCategory={setCategory}
        card={card}
        setCard={setCard}
        cards={cards}
        isFixed={isFixed}
        setIsFixed={setIsFixed}
        installments={installments}
        setInstallments={setInstallments}
        isPaid={isPaid}
        setIsPaid={setIsPaid}
        categories={customCategories}
      />
    </div>
  );
}

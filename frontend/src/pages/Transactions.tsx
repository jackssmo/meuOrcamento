import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  X,
  Layers,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { api } from "../services/api";
import { useFinancial } from "../hooks/useFinancial";
import { useDebounce } from "../hooks/useDebounce";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DeleteTransactionModal } from "../components/transaction/DeleteTransactionModal";
import { formatCurrency, formatDate } from "../utils/formatters";
import { DEFAULT_CATEGORY_LABELS } from "../constants/designSystem";
import type { Transaction, CardItem, Category } from "../types/models";

export type GroupMode = "list" | "card" | "category";

function displayName(value: string): string {
  const normalized = value.toLowerCase().trim();
  if (DEFAULT_CATEGORY_LABELS[normalized]) {
    return DEFAULT_CATEGORY_LABELS[normalized];
  }
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function Transactions() {
  const {
    selectedMonth,
    selectedYear,
    periodLabel,
    refreshKey,
    triggerRefresh,
    openNewTransaction,
    openEditTransaction,
  } = useFinancial();

  // Estados de dados
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de filtros
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const [onlyType, setOnlyType] = useState<"all" | "income" | "expense">("all");
  const [status, setStatus] = useState<"all" | "paid" | "pending">("all");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("list");

  // Listas de opções auxiliares
  const [cardsList, setCardsList] = useState<CardItem[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);

  // Estados dos modais de exclusão e drawer mobile
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Carregar cartões e categorias para os seletores
  useEffect(() => {
    api.get<CardItem[]>("/financial/cards")
      .then((res) => setCardsList(res.data || []))
      .catch((err) => console.error("Erro ao carregar cartões:", err));

    api.get<Category[]>("/financial/categories")
      .then((res) => setCustomCategories(res.data || []))
      .catch((err) => console.error("Erro ao carregar categorias:", err));
  }, []);

  // Lista combinada de categorias
  const allCategoryOptions = useMemo(() => {
    const defaultKeys = Object.keys(DEFAULT_CATEGORY_LABELS);
    const customKeys = customCategories.map((c) => c.name.toLowerCase());
    return Array.from(new Set([...defaultKeys, ...customKeys])).sort();
  }, [customCategories]);

  // Sempre que os filtros ou o período mudarem, reseta para a página 1
  useEffect(() => {
    setPage(1);
  }, [selectedMonth, selectedYear, debouncedSearch, onlyType, status, selectedCategory, selectedCard, groupMode]);

  // Buscar transações paginadas e filtradas
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/transactions", {
        params: {
          month: selectedMonth,
          year: selectedYear,
          search: debouncedSearch || undefined,
          type: onlyType === "all" ? undefined : onlyType,
          status: status === "all" ? undefined : status,
          category: selectedCategory || undefined,
          card: selectedCard || undefined,
          group: groupMode === "list" ? undefined : groupMode,
          page,
          pageSize,
        },
      });

      setTransactions(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalCount(response.data.pagination?.total || 0);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMonth,
    selectedYear,
    debouncedSearch,
    onlyType,
    status,
    selectedCategory,
    selectedCard,
    groupMode,
    page,
    pageSize,
  ]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions, refreshKey]);

  // Contador de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count += 1;
    if (onlyType !== "all") count += 1;
    if (status !== "all") count += 1;
    if (selectedCategory) count += 1;
    if (selectedCard) count += 1;
    return count;
  }, [debouncedSearch, onlyType, status, selectedCategory, selectedCard]);

  function handleClearFilters() {
    setSearchInput("");
    setOnlyType("all");
    setStatus("all");
    setSelectedCategory("");
    setSelectedCard("");
    setGroupMode("list");
  }

  // Alternar status de pagamento
  async function handleTogglePaid(transaction: Transaction) {
    const nextStatus = !transaction.is_paid;
    try {
      await api.patch(`/transactions/${transaction.id}/payment`, {
        is_paid: nextStatus,
      });
      toast.success(nextStatus ? "Marcada como paga!" : "Marcada como pendente!");
      triggerRefresh();
    } catch {
      toast.error("Erro ao atualizar pagamento.");
    }
  }

  // Confirmar exclusão (com suporte a ?scope=series)
  async function handleConfirmDelete(scope?: "series") {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    try {
      const query = scope === "series" ? "?scope=series" : "";
      const res = await api.delete(`/transactions/${transactionToDelete.id}${query}`);
      toast.success(res.data?.message || "Transação excluída com sucesso!");
      setTransactionToDelete(null);
      triggerRefresh();
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Erro ao excluir transação.");
      } else {
        toast.error("Erro inesperado ao excluir.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // Agrupamento de transações
  const groupedTransactions = useMemo(() => {
    if (groupMode === "list") {
      return [["Todas as transações", transactions] as const];
    }
    const groups = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
      const key = groupMode === "card" ? t.card || "Sem cartão" : t.category;
      (acc[key] ||= []).push(t);
      return acc;
    }, {});

    return Object.entries(groups).sort(([first], [second]) => {
      if (groupMode === "card") {
        if (first === "Sem cartão") return 1;
        if (second === "Sem cartão") return -1;
      }
      return first.localeCompare(second);
    });
  }, [groupMode, transactions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Top Header da Página: Título, Contador e Botão Primário */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="brand">
                {periodLabel}
              </Badge>
              {activeFiltersCount > 0 && (
                <Badge variant="neutral">
                  {activeFiltersCount} {activeFiltersCount === 1 ? "filtro ativo" : "filtros ativos"}
                </Badge>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b2920] tracking-tight">
              Extrato de Transações
            </h2>
            <p className="text-xs sm:text-sm text-[#64756a] mt-0.5">
              <strong className="text-[#1b2920] tabular-nums font-bold">{totalCount}</strong>{" "}
              {totalCount === 1 ? "lançamento encontrado" : "lançamentos encontrados"} neste período.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              onClick={() => openNewTransaction("expense")}
            >
              Nova Transação
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Barra de Busca e Filtros Combináveis */}
      <Card padding="md" className="space-y-4">
        {/* Linha da Busca Textual + Botão Drawer Mobile */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64756a] absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por descrição, cartão ou categoria..."
              className="bespoke-input pl-10 pr-9 text-sm"
              aria-label="Buscar transações"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-2.5 p-1 text-[#64756a] hover:text-[#1b2920] rounded cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botão de Filtros no Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden relative flex items-center justify-center p-2.5 rounded-xl border border-[#ded7cb] bg-white text-[#1b2920] hover:bg-[#f4efe6] transition-colors cursor-pointer"
            title="Abrir filtros"
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#236344] text-white text-[10px] font-bold grid place-items-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filtros em Grid (Desktop / Telas Médias) */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Filtro por Tipo */}
          <select
            value={onlyType}
            onChange={(e) => setOnlyType(e.target.value as "all" | "income" | "expense")}
            className="bespoke-input text-xs sm:text-sm bg-white"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Somente receitas</option>
            <option value="expense">Somente despesas</option>
          </select>

          {/* Filtro por Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "paid" | "pending")}
            className="bespoke-input text-xs sm:text-sm bg-white"
          >
            <option value="all">Todos os status</option>
            <option value="paid">Somente pagas</option>
            <option value="pending">Somente pendentes</option>
          </select>

          {/* Filtro por Categoria */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bespoke-input text-xs sm:text-sm bg-white"
          >
            <option value="">Todas as categorias</option>
            {allCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {displayName(cat)}
              </option>
            ))}
          </select>

          {/* Filtro por Cartão */}
          <select
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
            className="bespoke-input text-xs sm:text-sm bg-white"
          >
            <option value="">Todos os cartões</option>
            {cardsList.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Linha de Atalhos Rápidos de Exibição e Agrupamento (Desktop) */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#ede7dc]">
          <div className="flex items-center gap-6">
            {/* Status Rápido */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64756a]">
              <span>Status:</span>
              {(
                [
                  ["all", "Todas"],
                  ["paid", "Pagas"],
                  ["pending", "Pendentes"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStatus(val)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    status === val
                      ? val === "paid"
                        ? "bg-[#236344] text-white shadow-xs"
                        : val === "pending"
                        ? "bg-[#b86214] text-white shadow-xs"
                        : "bg-[#236344] text-white shadow-xs"
                      : "bg-[#f4efe6] text-[#64756a] hover:bg-[#ede5d8]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Agrupamento */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64756a]">
              <span>Exibir:</span>
              {(
                [
                  ["list", "Lista"],
                  ["card", "Por Cartão"],
                  ["category", "Por Categoria"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGroupMode(val)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    groupMode === val
                      ? "bg-[#152e22] text-white shadow-xs"
                      : "bg-[#f4efe6] text-[#64756a] hover:bg-[#ede5d8]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-bold text-[#b33a3a] hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* 3. Visualização: Tabela Desktop vs. Cards Mobile */}
      <Card padding="none" className="overflow-hidden">
        {/* A. Tabela Editorial Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f7f4ed] text-[#64756a] text-xs font-bold uppercase tracking-wider border-b border-[#e8e1d5]">
                <th className="p-4">Descrição</th>
                <th className="p-4">Data</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede7dc] text-sm">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#64756a] space-y-2">
                    <p className="font-semibold text-base text-[#1b2920]">
                      Nenhuma transação encontrada.
                    </p>
                    <p className="text-xs">
                      Altere os filtros acima ou registre um novo lançamento para este mês.
                    </p>
                  </td>
                </tr>
              ) : (
                groupedTransactions.map(([group, groupItems]) => (
                  <Fragment key={group}>
                    {groupMode !== "list" && (
                      <tr className="bg-[#f4efe6]/70">
                        <td
                          colSpan={5}
                          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1b2920]"
                        >
                          <div className="flex items-center gap-2">
                            {groupMode === "card" ? (
                              <CreditCard className="w-3.5 h-3.5 text-[#236344]" />
                            ) : (
                              <Layers className="w-3.5 h-3.5 text-[#236344]" />
                            )}
                            <span>{displayName(group)}</span>
                            <span className="text-[#64756a] normal-case font-medium">
                              ({groupItems.length} {groupItems.length === 1 ? "lançamento" : "lançamentos"})
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {groupItems.map((t) => {
                      const isIncome = t.type === "income";
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-[#fbf9f4] transition-colors group"
                        >
                          {/* Descrição + Categoria + Cartão */}
                          <td className="p-4 font-semibold text-[#1b2920]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{t.description}</span>
                              {t.card && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#f4efe6] text-[#4a554e] border border-[#ded7cb]">
                                  <CreditCard className="w-3 h-3 text-[#236344]" />
                                  <span>{t.card === "mercado_pago" ? "Mercado Pago" : t.card}</span>
                                </span>
                              )}
                              {Boolean(t.is_fixed) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0]">
                                  Renda Fixa
                                </span>
                              )}
                              {Boolean(t.installments && t.installments > 1) && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef7ee] text-[#b86214] border border-[#f5dfc6]">
                                  {t.installments}x
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-[#64756a] capitalize font-normal mt-0.5">
                              {displayName(t.category)}
                            </span>
                          </td>

                          {/* Data */}
                          <td className="p-4 text-xs font-medium text-[#64756a]">
                            {formatDate(t.date)}
                          </td>

                          {/* Valor */}
                          <td
                            className={`p-4 font-bold text-right tabular-nums text-sm ${
                              isIncome ? "text-[#1b6e44]" : "text-[#b33a3a]"
                            }`}
                          >
                            {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                          </td>

                          {/* Status de Pagamento */}
                          <td className="p-4 text-center">
                            {!isIncome ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePaid(t)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                  t.is_paid
                                    ? "bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0] hover:bg-[#e2f1e8]"
                                    : "bg-[#fef7ee] text-[#b86214] border border-[#f5dfc6] hover:bg-[#fbf0e1]"
                                }`}
                                title={t.is_paid ? "Clique para marcar como pendente" : "Clique para marcar como paga"}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    t.is_paid ? "bg-[#1b6e44]" : "bg-[#b86214]"
                                  }`}
                                />
                                <span>{t.is_paid ? "Paga" : "Pendente"}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1b6e44]" />
                                Recebido
                              </span>
                            )}
                          </td>

                          {/* Ações (Editar e Excluir) */}
                          <td className="p-4 text-center space-x-1">
                            <button
                              type="button"
                              onClick={() => openEditTransaction(t)}
                              className="p-1.5 text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] rounded-lg transition-colors cursor-pointer"
                              title="Editar transação"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTransactionToDelete(t)}
                              className="p-1.5 text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] rounded-lg transition-colors cursor-pointer"
                              title="Excluir transação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* B. Cards Escaneáveis por Toque (Mobile) */}
        <div className="md:hidden divide-y divide-[#ede7dc]">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-[#64756a] space-y-2">
              <p className="font-semibold text-sm text-[#1b2920]">
                Nenhuma transação encontrada.
              </p>
              <p className="text-xs">
                Toque no botão de filtros ou registre um novo lançamento.
              </p>
            </div>
          ) : (
            transactions.map((t) => {
              const isIncome = t.type === "income";
              return (
                <div key={t.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#1b2920] leading-tight">
                        {t.description}
                      </h4>
                      <p className="text-xs text-[#64756a] mt-0.5">
                        {displayName(t.category)} • {formatDate(t.date)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-base font-bold tabular-nums block ${
                          isIncome ? "text-[#1b6e44]" : "text-[#b33a3a]"
                        }`}
                      >
                        {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Badges e Ações na Linha Inferior do Card */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f4efe6]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {t.card && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f4efe6] text-[#4a554e] border border-[#ded7cb]">
                          <CreditCard className="w-3 h-3 text-[#236344]" />
                          <span>{t.card === "mercado_pago" ? "Mercado Pago" : t.card}</span>
                        </span>
                      )}

                      {!isIncome ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(t)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${
                            t.is_paid
                              ? "bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0]"
                              : "bg-[#fef7ee] text-[#b86214] border border-[#f5dfc6]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.is_paid ? "bg-[#1b6e44]" : "bg-[#b86214]"
                            }`}
                          />
                          <span>{t.is_paid ? "Paga" : "Pendente"}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0]">
                          Recebido
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTransaction(t)}
                        className="p-1.5 text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] rounded-lg cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionToDelete(t)}
                        className="p-1.5 text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] rounded-lg cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Paginação Editorial */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#e8e1d5] bg-[#fbf9f4] flex items-center justify-between gap-4 select-none">
            <span className="text-xs text-[#64756a] tabular-nums font-medium">
              Página <strong className="text-[#1b2920] font-bold">{page}</strong> de{" "}
              <strong className="text-[#1b2920] font-bold">{totalPages}</strong> ({totalCount} lançamentos)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 5. Mobile Bottom Sheet / Drawer de Filtros Deslizante */}
      {isMobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 animate-in fade-in duration-150">
          <div className="w-full bg-white rounded-t-3xl border-t border-[#e8e1d5] p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Cabeçalho do Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-[#ede7dc]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#236344]" />
                <h3 className="text-base font-bold text-[#1b2920]">
                  Filtros Avançados
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 text-[#64756a] hover:text-[#1b2920] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo dos Filtros */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Tipo de Lançamento
                </label>
                <select
                  value={onlyType}
                  onChange={(e) => setOnlyType(e.target.value as "all" | "income" | "expense")}
                  className="bespoke-input text-sm bg-white"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="income">Somente receitas</option>
                  <option value="expense">Somente despesas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Status de Pagamento
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "all" | "paid" | "pending")}
                  className="bespoke-input text-sm bg-white"
                >
                  <option value="all">Todos os status</option>
                  <option value="paid">Somente pagas</option>
                  <option value="pending">Somente pendentes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Categoria
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bespoke-input text-sm bg-white"
                >
                  <option value="">Todas as categorias</option>
                  {allCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {displayName(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Cartão de Crédito
                </label>
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="bespoke-input text-sm bg-white"
                >
                  <option value="">Todos os cartões</option>
                  {cardsList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações no Rodapé do Drawer */}
            <div className="pt-4 border-t border-[#ede7dc] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-[#b33a3a] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-primary py-2.5 px-5 text-sm font-semibold rounded-xl cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Ver Resultados ({totalCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Editorial de Exclusão (sem window.confirm) */}
      <DeleteTransactionModal
        isOpen={Boolean(transactionToDelete)}
        transaction={transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

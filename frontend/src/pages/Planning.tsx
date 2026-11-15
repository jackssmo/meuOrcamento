import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  PieChart,
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { isAxiosError } from "axios";
import { api } from "../services/api";
import { useFinancial } from "../hooks/useFinancial";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { formatCurrency, formatCurrencyInput, formatDate } from "../utils/formatters";
import { DEFAULT_CATEGORY_LABELS, MONTH_NAMES } from "../constants/designSystem";
import type { CardItem, Budget, Goal, Category } from "../types/models";

export function Planning() {
  const {
    selectedMonth,
    selectedYear,
    periodLabel,
    refreshKey,
    triggerRefresh,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<"cards" | "budgets" | "goals">("cards");

  // Dados das 3 abas
  const [cards, setCards] = useState<CardItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categoriesList, setCustomCategories] = useState<Category[]>([]);

  // Dados do relatório mensal (gastos reais por cartão e por categoria no mês ativo)
  const [byCardExpenses, setByCardExpenses] = useState<Record<string, number>>({});
  const [byCategoryExpenses, setByCategoryExpenses] = useState<Record<string, number>>({});
  const [cardUnpaidExpenses, setCardUnpaidExpenses] = useState<Record<string, number>>({});

  // Modais de Formulários (Criação/Edição)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardLimitInput, setCardLimitInput] = useState("");

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmountInput, setBudgetAmountInput] = useState("");

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTargetInput, setGoalTargetInput] = useState("");
  const [goalCurrentInput, setGoalCurrentInput] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  const [isAporteModalOpen, setIsAporteModalOpen] = useState(false);
  const [goalToAporte, setGoalToAporte] = useState<Goal | null>(null);
  const [aporteInput, setAporteInput] = useState("");

  // Modais de Confirmação Bespoke (Zero window.confirm)
  const [itemToDelete, setItemToDelete] = useState<{
    type: "card" | "budget" | "goal";
    id: number;
    title: string;
  } | null>(null);
  const [cardToPay, setCardToPay] = useState<{ id: number; name: string; amount: number } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carregar Cartões, Orçamentos, Metas e Relatórios do Mês
  const loadPlanningData = useCallback(async () => {
    try {
      const [cardsRes, budgetsRes, goalsRes, categoriesRes, reportRes, pendingRes] = await Promise.all([
        api.get<CardItem[]>("/financial/cards"),
        api.get<Budget[]>("/financial/budgets"),
        api.get<Goal[]>("/financial/goals"),
        api.get<Category[]>("/financial/categories"),
        api.get("/financial/reports/monthly", {
          params: { month: selectedMonth, year: selectedYear },
        }),
        api.get("/transactions", {
          params: {
            month: selectedMonth,
            year: selectedYear,
            type: "expense",
            status: "pending",
            pageSize: 100,
          },
        }),
      ]);

      setCards(cardsRes.data || []);
      setBudgets(budgetsRes.data || []);
      setGoals(goalsRes.data || []);
      setCustomCategories(categoriesRes.data || []);

      if (reportRes.data) {
        setByCardExpenses(reportRes.data.byCard || {});
        setByCategoryExpenses(reportRes.data.byCategory || {});
      }

      // Calcular despesas não pagas por cartão para a fatura do mês
      const pendingTransactions = pendingRes.data?.data || [];
      const unpaidMap: Record<string, number> = {};
      for (const t of pendingTransactions) {
        if (t.card) {
          unpaidMap[t.card] = (unpaidMap[t.card] || 0) + Number(t.amount);
        }
      }
      setCardUnpaidExpenses(unpaidMap);
    } catch (error) {
      console.error("Erro ao carregar dados de planejamento:", error);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    void loadPlanningData();
  }, [loadPlanningData, refreshKey]);

  // Lista combinada de categorias para o orçamento
  const allCategoryOptions = useMemo(() => {
    const defaultKeys = Object.keys(DEFAULT_CATEGORY_LABELS);
    const customKeys = categoriesList.map((c) => c.name.toLowerCase());
    return Array.from(new Set([...defaultKeys, ...customKeys])).sort();
  }, [categoriesList]);

  // Orçamentos filtrados para o mês e ano ativos
  const currentMonthBudgets = useMemo(() => {
    return budgets.filter((b) => b.month === selectedMonth && b.year === selectedYear);
  }, [budgets, selectedMonth, selectedYear]);

  // ==========================================
  // OPERAÇÕES DE CARTÕES
  // ==========================================
  function openCreateCard() {
    setEditingCard(null);
    setCardName("");
    setCardLimitInput("");
    setIsCardModalOpen(true);
  }

  function openEditCard(card: CardItem) {
    setEditingCard(card);
    setCardName(card.name);
    setCardLimitInput(card.credit_limit ? (card.credit_limit * 100).toFixed(0) : "");
    setIsCardModalOpen(true);
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    const rawLimit = cardLimitInput.replace(/\D/g, "");
    const numericLimit = rawLimit ? Number(rawLimit) / 100 : 0;

    setIsSubmitting(true);
    try {
      if (editingCard) {
        await api.patch(`/financial/cards/${editingCard.id}`, {
          name: cardName.trim(),
          credit_limit: numericLimit,
        });
        toast.success("Cartão atualizado com sucesso!");
      } else {
        await api.post("/financial/cards", {
          name: cardName.trim(),
          credit_limit: numericLimit,
        });
        toast.success("Cartão cadastrado com sucesso!");
      }
      setIsCardModalOpen(false);
      triggerRefresh();
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Erro ao salvar cartão.");
      } else {
        toast.error("Erro inesperado ao salvar cartão.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmPayBill() {
    if (!cardToPay) return;
    setIsSubmitting(true);
    try {
      await api.post(`/financial/cards/${cardToPay.id}/pay`, {
        month: selectedMonth,
        year: selectedYear,
      });
      toast.success(`Fatura de ${MONTH_NAMES[selectedMonth - 1]} do cartão ${cardToPay.name} quitada com sucesso!`);
      setCardToPay(null);
      triggerRefresh();
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Erro ao quitar fatura.");
      } else {
        toast.error("Erro inesperado ao quitar fatura.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // OPERAÇÕES DE ORÇAMENTOS
  // ==========================================
  function openCreateBudget() {
    setEditingBudget(null);
    setBudgetCategory("");
    setBudgetAmountInput("");
    setIsBudgetModalOpen(true);
  }

  function openEditBudget(budget: Budget) {
    setEditingBudget(budget);
    setBudgetCategory(budget.category);
    setBudgetAmountInput(budget.amount ? (budget.amount * 100).toFixed(0) : "");
    setIsBudgetModalOpen(true);
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    const rawAmount = budgetAmountInput.replace(/\D/g, "");
    const numericAmount = rawAmount ? Number(rawAmount) / 100 : 0;

    if (numericAmount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBudget) {
        await api.patch(`/financial/budgets/${editingBudget.id}`, {
          amount: numericAmount,
        });
        toast.success("Orçamento atualizado!");
      } else {
        await api.post("/financial/budgets", {
          category: budgetCategory,
          month: selectedMonth,
          year: selectedYear,
          amount: numericAmount,
        });
        toast.success("Orçamento mensal criado!");
      }
      setIsBudgetModalOpen(false);
      triggerRefresh();
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Erro ao salvar orçamento.");
      } else {
        toast.error("Erro inesperado ao salvar orçamento.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // OPERAÇÕES DE METAS
  // ==========================================
  function openCreateGoal() {
    setEditingGoal(null);
    setGoalName("");
    setGoalTargetInput("");
    setGoalCurrentInput("");
    setGoalDeadline("");
    setIsGoalModalOpen(true);
  }

  function openEditGoal(goal: Goal) {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setGoalTargetInput(goal.target_amount ? (goal.target_amount * 100).toFixed(0) : "");
    setGoalCurrentInput(goal.current_amount ? (goal.current_amount * 100).toFixed(0) : "");
    setGoalDeadline(goal.deadline ? goal.deadline.split("T")[0] : "");
    setIsGoalModalOpen(true);
  }

  function openAporteGoal(goal: Goal) {
    setGoalToAporte(goal);
    setAporteInput("");
    setIsAporteModalOpen(true);
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const rawTarget = goalTargetInput.replace(/\D/g, "");
    const rawCurrent = goalCurrentInput.replace(/\D/g, "");
    const targetAmount = rawTarget ? Number(rawTarget) / 100 : 0;
    const currentAmount = rawCurrent ? Number(rawCurrent) / 100 : 0;

    if (targetAmount <= 0) {
      toast.error("O valor-alvo deve ser maior que zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: goalName.trim(),
        target_amount: targetAmount,
        current_amount: currentAmount,
        deadline: goalDeadline || null,
      };

      if (editingGoal) {
        await api.patch(`/financial/goals/${editingGoal.id}`, payload);
        toast.success("Meta atualizada com sucesso!");
      } else {
        await api.post("/financial/goals", payload);
        toast.success("Nova meta financeira criada!");
      }
      setIsGoalModalOpen(false);
      triggerRefresh();
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Erro ao salvar meta.");
      } else {
        toast.error("Erro inesperado ao salvar meta.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmAporte(e: React.FormEvent) {
    e.preventDefault();
    if (!goalToAporte) return;

    const rawAporte = aporteInput.replace(/\D/g, "");
    const aporteVal = rawAporte ? Number(rawAporte) / 100 : 0;

    if (aporteVal <= 0) {
      toast.error("Informe um valor de aporte válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newTotal = Number(goalToAporte.current_amount || 0) + aporteVal;
      await api.patch(`/financial/goals/${goalToAporte.id}`, {
        current_amount: newTotal,
      });
      toast.success(`Aporte de ${formatCurrency(aporteVal)} registrado!`);
      setIsAporteModalOpen(false);
      triggerRefresh();
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Erro ao registrar aporte.");
      } else {
        toast.error("Erro inesperado ao registrar aporte.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // EXCLUSÃO GENÉRICA BESPOKE (SEM WINDOW.CONFIRM)
  // ==========================================
  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    try {
      if (itemToDelete.type === "card") {
        await api.delete(`/financial/cards/${itemToDelete.id}`);
        toast.success("Cartão excluído com sucesso!");
      } else if (itemToDelete.type === "budget") {
        await api.delete(`/financial/budgets/${itemToDelete.id}`);
        toast.success("Orçamento excluído com sucesso!");
      } else if (itemToDelete.type === "goal") {
        await api.delete(`/financial/goals/${itemToDelete.id}`);
        toast.success("Meta excluída com sucesso!");
      }
      setItemToDelete(null);
      triggerRefresh();
    } catch (err) {
      if (isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Erro ao excluir item.");
      } else {
        toast.error("Erro inesperado ao excluir item.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* 1. Top Banner do Hub de Planejamento */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Badge variant="brand" className="mb-2">
              Planejamento Financeiro
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b2920] tracking-tight">
              Cartões, Orçamentos e Metas
            </h2>
            <p className="text-xs sm:text-sm text-[#64756a] mt-0.5">
              Gestão estratégica de limites, tetos por categoria e reserva de objetivos para {periodLabel}.
            </p>
          </div>
        </div>

        {/* Abas de Navegação do Hub */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#ede7dc] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cards"
                ? "bg-[#236344] text-white shadow-xs"
                : "bg-[#f4efe6] text-[#64756a] hover:bg-[#ede5d8]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cartões e Faturas ({cards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("budgets")}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "budgets"
                ? "bg-[#236344] text-white shadow-xs"
                : "bg-[#f4efe6] text-[#64756a] hover:bg-[#ede5d8]"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Orçamentos Mensais ({currentMonthBudgets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("goals")}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "goals"
                ? "bg-[#236344] text-white shadow-xs"
                : "bg-[#f4efe6] text-[#64756a] hover:bg-[#ede5d8]"
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            <span>Metas Financeiras ({goals.length})</span>
          </button>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* ABA 1: CARTÕES E FATURAS                                            */}
      {/* ==================================================================== */}
      {activeTab === "cards" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1b2920]">Cartões de Crédito</h3>
              <p className="text-xs text-[#64756a]">Controle de limites totais, utilizados e quitação mensal.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateCard}
            >
              Novo Cartão
            </Button>
          </div>

          {cards.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <CreditCard className="w-10 h-10 text-[#64756a] mx-auto opacity-70" />
              <p className="text-sm font-semibold text-[#1b2920]">Nenhum cartão cadastrado.</p>
              <p className="text-xs text-[#64756a] max-w-sm mx-auto">
                Cadastre seus cartões de crédito para acompanhar faturas e limites em tempo real.
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={openCreateCard}>
                  Cadastrar Primeiro Cartão
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {cards.map((c) => {
                const limit = Number(c.credit_limit) || 0;
                const used = Number(c.used_limit) || 0;
                const available = Number(c.available_limit) || Math.max(0, limit - used);
                const usagePercentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const isOverLimit = limit > 0 && used > limit;

                const monthSpent = byCardExpenses[c.name] || 0;
                const monthUnpaid = cardUnpaidExpenses[c.name] || 0;
                const isBillPaid = monthSpent > 0 && monthUnpaid === 0;

                return (
                  <Card key={c.id} padding="md" className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#f4efe6] border border-[#ded7cb] text-[#236344]">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-[#1b2920]">{c.name}</h4>
                          <span className="text-xs text-[#64756a] tabular-nums font-medium">
                            Fatura de {MONTH_NAMES[selectedMonth - 1]}: {formatCurrency(monthSpent)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditCard(c)}
                          className="p-1.5 text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] rounded-lg cursor-pointer"
                          title="Editar cartão"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ type: "card", id: c.id, title: c.name })}
                          className="p-1.5 text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] rounded-lg cursor-pointer"
                          title="Excluir cartão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Métricas de Limite */}
                    {limit > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#fbf9f4] border border-[#ded7cb] text-center text-xs tabular-nums">
                          <div>
                            <span className="block text-[#64756a] font-medium text-[11px]">Limite Total</span>
                            <strong className="text-[#1b2920] font-bold text-sm">{formatCurrency(limit)}</strong>
                          </div>
                          <div>
                            <span className="block text-[#64756a] font-medium text-[11px]">Usado</span>
                            <strong className={`font-bold text-sm ${isOverLimit ? "text-[#b33a3a]" : "text-[#b86214]"}`}>
                              {formatCurrency(used)}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[#64756a] font-medium text-[11px]">Disponível</span>
                            <strong className={`font-bold text-sm ${available < 0 ? "text-[#b33a3a]" : "text-[#1b6e44]"}`}>
                              {formatCurrency(available)}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-[#64756a] mb-1 font-medium">
                            <span>{usagePercentage}% utilizado</span>
                            {isOverLimit && (
                              <span className="inline-flex items-center gap-1 font-bold text-[#b33a3a]">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Limite estourado!
                              </span>
                            )}
                          </div>
                          <div className="h-2 w-full bg-[#ede7dc] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOverLimit ? "bg-[#b33a3a]" : usagePercentage >= 80 ? "bg-[#b86214]" : "bg-[#236344]"
                              }`}
                              style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#fbf9f4] border border-[#ded7cb] text-xs text-[#64756a] flex justify-between items-center">
                        <span>Limite de crédito não configurado</span>
                        <button
                          type="button"
                          onClick={() => openEditCard(c)}
                          className="text-[#236344] font-bold hover:underline cursor-pointer"
                        >
                          Definir Limite
                        </button>
                      </div>
                    )}

                    {/* Ação de Quitação de Fatura com Confirmação Bespoke */}
                    {monthSpent > 0 && (
                      <div className="pt-2 border-t border-[#ede7dc]">
                        {isBillPaid ? (
                          <div className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#eef7f2] border border-[#c2ded0] text-xs font-bold text-[#1b6e44]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Fatura de {MONTH_NAMES[selectedMonth - 1]} quitada!</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCardToPay({ id: c.id, name: c.name, amount: monthUnpaid })}
                            className="btn-primary w-full py-2.5 px-4 text-xs font-bold rounded-xl shadow-xs"
                          >
                            Pagar fatura de {MONTH_NAMES[selectedMonth - 1]} ({formatCurrency(monthUnpaid)})
                          </button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: ORÇAMENTOS MENSAIS                                            */}
      {/* ==================================================================== */}
      {activeTab === "budgets" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1b2920]">Orçamentos de {periodLabel}</h3>
              <p className="text-xs text-[#64756a]">Defina metas máximas de gasto por categoria e acompanhe despesas em tempo real.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateBudget}
            >
              Novo Orçamento
            </Button>
          </div>

          {currentMonthBudgets.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <PieChart className="w-10 h-10 text-[#64756a] mx-auto opacity-70" />
              <p className="text-sm font-semibold text-[#1b2920]">Nenhum orçamento configurado para {periodLabel}.</p>
              <p className="text-xs text-[#64756a] max-w-sm mx-auto">
                Crie um teto de gastos para categorias como alimentação, lazer ou transporte para manter o orçamento equilibrado.
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={openCreateBudget}>
                  Criar Primeiro Orçamento do Mês
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {currentMonthBudgets.map((b) => {
                const categoryNormalized = b.category.toLowerCase().trim();
                const actualSpent = byCategoryExpenses[categoryNormalized] || 0;
                const budgetAmount = Number(b.amount) || 0;
                const percent = budgetAmount > 0 ? Math.round((actualSpent / budgetAmount) * 100) : 0;
                const isOverBudget = actualSpent > budgetAmount;
                const isWarning = percent >= 80 && !isOverBudget;
                const remaining = budgetAmount - actualSpent;

                const displayName =
                  DEFAULT_CATEGORY_LABELS[categoryNormalized] ||
                  b.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

                return (
                  <Card key={b.id} padding="md" className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-[#1b2920]">{displayName}</h4>
                        <span className="text-xs text-[#64756a] tabular-nums font-medium">
                          Gasto atual: {formatCurrency(actualSpent)} de {formatCurrency(budgetAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditBudget(b)}
                          className="p-1.5 text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] rounded-lg cursor-pointer"
                          title="Editar orçamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ type: "budget", id: b.id, title: displayName })}
                          className="p-1.5 text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] rounded-lg cursor-pointer"
                          title="Excluir orçamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso do Orçamento */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold tabular-nums">
                        <span className={isOverBudget ? "text-[#b33a3a]" : isWarning ? "text-[#b86214]" : "text-[#236344]"}>
                          {percent}% atingido
                        </span>
                        <span className={isOverBudget ? "text-[#b33a3a] font-bold" : "text-[#64756a]"}>
                          {isOverBudget
                            ? `Estourado por ${formatCurrency(Math.abs(remaining))}`
                            : `Resta ${formatCurrency(remaining)}`}
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-[#ede7dc] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverBudget ? "bg-[#b33a3a]" : isWarning ? "bg-[#b86214]" : "bg-[#236344]"
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: METAS FINANCEIRAS                                             */}
      {/* ==================================================================== */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1b2920]">Metas de Poupança e Objetivos</h3>
              <p className="text-xs text-[#64756a]">Acompanhe o progresso da sua reserva de emergência, viagens e conquistas.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateGoal}
            >
              Nova Meta
            </Button>
          </div>

          {goals.length === 0 ? (
            <Card padding="lg" className="text-center py-12 space-y-3">
              <PiggyBank className="w-10 h-10 text-[#236344] mx-auto opacity-75" />
              <p className="text-sm font-semibold text-[#1b2920]">Nenhuma meta financeira cadastrada.</p>
              <p className="text-xs text-[#64756a] max-w-sm mx-auto">
                Crie sua primeira meta financeira para reservar recursos com propósito e prazos claros.
              </p>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={openCreateGoal}>
                  Cadastrar Primeira Meta
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {goals.map((g) => {
                const target = Number(g.target_amount) || 1;
                const current = Number(g.current_amount) || 0;
                const percent = Math.min(100, Math.round((current / target) * 100));
                const isCompleted = current >= target;

                return (
                  <Card key={g.id} padding="md" className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-[#eef7f2] border border-[#c2ded0] text-[#236344]">
                          <PiggyBank className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-[#1b2920]">{g.name}</h4>
                          {g.deadline && (
                            <span className="text-xs text-[#64756a]">
                              Prazo: {formatDate(g.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditGoal(g)}
                          className="p-1.5 text-[#64756a] hover:text-[#236344] hover:bg-[#eef7f2] rounded-lg cursor-pointer"
                          title="Editar meta"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ type: "goal", id: g.id, title: g.name })}
                          className="p-1.5 text-[#64756a] hover:text-[#b33a3a] hover:bg-[#fdf4f4] rounded-lg cursor-pointer"
                          title="Excluir meta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso e Valores */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline text-xs tabular-nums">
                        <span className="font-bold text-[#1b2920] text-base">
                          {formatCurrency(current)}
                        </span>
                        <span className="text-[#64756a]">
                          de {formatCurrency(target)} ({percent}%)
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-[#ede7dc] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? "bg-[#1b6e44]" : "bg-[#236344]"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Botão Ação Rápida: Registrar Aporte */}
                    <div className="pt-2 border-t border-[#ede7dc] flex items-center justify-between">
                      {isCompleted ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b6e44]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Meta concluída com sucesso!</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64756a] tabular-nums font-medium">
                          Faltam {formatCurrency(Math.max(0, target - current))}
                        </span>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<TrendingUp className="w-3.5 h-3.5 text-[#236344]" />}
                        onClick={() => openAporteGoal(g)}
                      >
                        Aportar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAIS DE FORMULÁRIO (CARTÃO, ORÇAMENTO, META E APORTE)               */}
      {/* ==================================================================== */}

      {/* Modal de Cartão */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1b2920]">
                {editingCard ? "Editar Cartão de Crédito" : "Novo Cartão de Crédito"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="p-1.5 text-[#64756a] hover:text-[#1b2920] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Nome do Cartão
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Ex.: Nubank Ultravioleta, Itaú Black"
                  className="bespoke-input text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Limite Total de Crédito (R$)
                </label>
                <input
                  type="text"
                  value={cardLimitInput ? formatCurrencyInput(cardLimitInput) : ""}
                  onChange={(e) => setCardLimitInput(e.target.value)}
                  placeholder="0,00"
                  className="bespoke-input text-sm font-bold tabular-nums"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCardModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Salvar Cartão
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Orçamento */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1b2920]">
                {editingBudget ? "Editar Orçamento" : `Novo Orçamento (${periodLabel})`}
              </h3>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1.5 text-[#64756a] hover:text-[#1b2920] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Categoria
                </label>
                <select
                  required
                  disabled={Boolean(editingBudget)}
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="bespoke-input text-sm bg-white disabled:bg-[#f4efe6]"
                >
                  <option value="" disabled>Selecione a categoria...</option>
                  {allCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {DEFAULT_CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Teto Máximo para o Mês (R$)
                </label>
                <input
                  type="text"
                  required
                  value={budgetAmountInput ? formatCurrencyInput(budgetAmountInput) : ""}
                  onChange={(e) => setBudgetAmountInput(e.target.value)}
                  placeholder="0,00"
                  className="bespoke-input text-sm font-bold tabular-nums"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBudgetModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Salvar Orçamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Meta */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1b2920]">
                {editingGoal ? "Editar Meta Financeira" : "Nova Meta Financeira"}
              </h3>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 text-[#64756a] hover:text-[#1b2920] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Ex.: Reserva de Emergência, Viagem Europa"
                  className="bespoke-input text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={goalTargetInput ? formatCurrencyInput(goalTargetInput) : ""}
                    onChange={(e) => setGoalTargetInput(e.target.value)}
                    placeholder="0,00"
                    className="bespoke-input text-sm font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                    Já acumulado (R$)
                  </label>
                  <input
                    type="text"
                    value={goalCurrentInput ? formatCurrencyInput(goalCurrentInput) : ""}
                    onChange={(e) => setGoalCurrentInput(e.target.value)}
                    placeholder="0,00"
                    className="bespoke-input text-sm font-bold tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Prazo Desejado (Opcional)
                </label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="bespoke-input text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsGoalModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Salvar Meta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido de Aporte em Meta */}
      {isAporteModalOpen && goalToAporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1b2920]">
                Aporte em {goalToAporte.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAporteModalOpen(false)}
                className="p-1.5 text-[#64756a] hover:text-[#1b2920] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#64756a]">
              Saldo atual acumulado: <strong className="text-[#1b2920] tabular-nums font-bold">{formatCurrency(goalToAporte.current_amount || 0)}</strong>.
            </p>

            <form onSubmit={handleConfirmAporte} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64756a] mb-1.5">
                  Valor do Aporte (R$)
                </label>
                <input
                  type="text"
                  required
                  value={aporteInput ? formatCurrencyInput(aporteInput) : ""}
                  onChange={(e) => setAporteInput(e.target.value)}
                  placeholder="0,00"
                  className="bespoke-input text-sm font-bold tabular-nums"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAporteModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Confirmar Aporte
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Quitação de Fatura Bespoke */}
      {cardToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#eef7f2] border border-[#c2ded0] text-[#236344]">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1b2920]">Quitar Fatura de Cartão</h3>
                <p className="text-xs text-[#64756a]">{cardToPay.name} • {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fbf9f4] border border-[#ded7cb] text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#64756a]">Valor total pendente:</span>
                <span className="text-base font-bold text-[#1b2920] tabular-nums">
                  {formatCurrency(cardToPay.amount)}
                </span>
              </div>
              <p className="text-[11px] text-[#64756a] leading-relaxed pt-1 border-t border-[#ede7dc]">
                Ao confirmar, todas as despesas pendentes deste cartão vinculadas ao mês selecionado serão marcadas como pagas e o limite utilizado será liberado.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setCardToPay(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleConfirmPayBill}
              >
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editorial de Confirmação de Exclusão (Zero window.confirm) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152e22]/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e8e1d5] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#fdf4f4] border border-[#f5cece] text-[#b33a3a]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1b2920]">
                  Excluir {itemToDelete.type === "card" ? "Cartão" : itemToDelete.type === "budget" ? "Orçamento" : "Meta"}
                </h3>
                <p className="text-xs text-[#64756a]">Ação irreversível de remoção</p>
              </div>
            </div>

            <p className="text-xs text-[#64756a] leading-relaxed">
              Tem certeza que deseja excluir <strong>{itemToDelete.title}</strong>? As despesas e lançamentos financeiros históricos serão preservados.
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setItemToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleConfirmDelete}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

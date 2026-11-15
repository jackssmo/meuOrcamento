import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  PieChart,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useFinancial } from "../hooks/useFinancial";
import { Card, CardHeader } from "../components/ui/Card";
import { formatCurrency } from "../utils/formatters";
import { AnnualEvolutionChart } from "../components/dashboard/AnnualEvolutionChart";
import { CategoryDistribution } from "../components/dashboard/CategoryDistribution";
import { CreditCardsWidget } from "../components/dashboard/CreditCardsWidget";
import { RecentTransactionsWidget } from "../components/dashboard/RecentTransactionsWidget";
import type {
  Transaction,
  CardItem,
  MonthlyHistoryItem,
} from "../types/models";

export function Dashboard() {
  const { user } = useAuth();
  const userName = user?.name ? user.name.split(" ")[0] : "Usuário";

  const {
    selectedMonth,
    selectedYear,
    periodLabel,
    setPeriod,
    refreshKey,
    triggerRefresh,
    openEditTransaction,
  } = useFinancial();

  // Estados locais da página
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyHistoryItem[]>([]);
  const [cardsList, setCardsList] = useState<CardItem[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({});
  const [cardTotals, setCardTotals] = useState<Record<string, number>>({});
  const [cardUnpaidTotals, setCardUnpaidTotals] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    paidExpense: 0,
    pendingExpense: 0,
    balance: 0,
    realizedBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados de resumo e transações do mês selecionado
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [summaryRes, transactionsRes, cardsRes, reportRes] = await Promise.all([
        api.get("/transactions/summary", {
          params: { month: selectedMonth, year: selectedYear },
        }),
        api.get("/transactions", {
          params: {
            month: selectedMonth,
            year: selectedYear,
            sort: "recent",
            onlyFirstInstallment: true,
            page: 1,
            pageSize: 6,
          },
        }),
        api.get<CardItem[]>("/financial/cards"),
        api.get("/financial/reports/monthly", {
          params: { month: selectedMonth, year: selectedYear },
        }),
      ]);

      setSummary(summaryRes.data);
      setRecentTransactions(transactionsRes.data.data || []);
      setCardsList(cardsRes.data || []);

      if (reportRes.data) {
        // byCategory é um array [{category, type, total}] — converter para Record<string, number>
        // filtrando apenas type === 'expense' e convertendo total (MySQL pode retornar string)
        const rawCategories: Array<{ category: string; type: string; total: string | number }> =
          reportRes.data.byCategory || [];
        const catMap: Record<string, number> = {};
        for (const item of rawCategories) {
          if (item.type === "expense") {
            const key = item.category;
            catMap[key] = (catMap[key] || 0) + Number(item.total);
          }
        }
        setCategoryTotals(catMap);

        // byCard também é um array [{card, total, ...}] — converter para Record<string, number>
        const rawCards: Array<{ card: string; total: string | number }> =
          reportRes.data.byCard || [];
        const cardMap: Record<string, number> = {};
        for (const item of rawCards) {
          cardMap[item.card] = Number(item.total);
        }
        setCardTotals(cardMap);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Carregar histórico anual para o gráfico SVG
  const loadAnnualHistory = useCallback(async () => {
    try {
      const response = await api.get("/financial/reports/monthly", {
        params: { year: selectedYear },
      });
      if (response.data?.monthly) {
        setMonthlyHistory(response.data.monthly);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico anual:", error);
    }
  }, [selectedYear]);

  // Calcular totais de despesas não pagas por cartão para a fatura
  const loadCardUnpaidTotals = useCallback(async () => {
    try {
      const response = await api.get("/transactions", {
        params: {
          month: selectedMonth,
          year: selectedYear,
          type: "expense",
          status: "pending",
          pageSize: 100,
        },
      });
      const pending: Transaction[] = response.data?.data || [];
      const totals: Record<string, number> = {};
      for (const t of pending) {
        if (t.card) {
          totals[t.card] = (totals[t.card] || 0) + Number(t.amount);
        }
      }
      setCardUnpaidTotals(totals);
    } catch (error) {
      console.error("Erro ao calcular despesas pendentes por cartão:", error);
    }
  }, [selectedMonth, selectedYear]);

  // Efeito de busca geral reagindo ao período e à chave de atualização
  useEffect(() => {
    void loadDashboardData();
    void loadCardUnpaidTotals();
  }, [loadDashboardData, loadCardUnpaidTotals, refreshKey]);

  useEffect(() => {
    void loadAnnualHistory();
  }, [loadAnnualHistory, refreshKey]);

  // Alternância rápida de pagamento na prévia de transações
  async function handleTogglePaid(transaction: Transaction) {
    const nextStatus = !transaction.is_paid;
    try {
      await api.patch(`/transactions/${transaction.id}/payment`, {
        is_paid: nextStatus,
      });
      toast.success(
        nextStatus ? "Transação marcada como paga!" : "Transação marcada como pendente!"
      );
      triggerRefresh();
    } catch {
      toast.error("Não foi possível atualizar o status de pagamento.");
    }
  }

  return (
    <div
      className={`space-y-6 sm:space-y-8 animate-in fade-in duration-150 transition-opacity ${
        isLoading ? "opacity-85 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 1. Header de Boas-Vindas */}
      <div className="pb-2 border-b border-[#e8e1d5]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1b2920] tracking-tight">
          Olá, {userName}
        </h2>
        <p className="text-xs sm:text-sm text-[#64756a] mt-0.5">
          Acompanhe o fluxo financeiro de <span className="font-semibold text-[#1b2920]">{periodLabel}</span>.
        </p>
      </div>

      {/* 2. Resumo Financeiro Mensal: 3 Cards Editoriais com Hierarquia Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Card Receitas */}
        <Card padding="md" className="relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64756a]">
                Receitas do Mês
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1b6e44] tabular-nums mt-1.5">
                {formatCurrency(summary.totalIncome)}
              </h3>
              <p className="text-[11px] text-[#64756a] mt-2 font-medium">
                Entradas confirmadas no período
              </p>
            </div>
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-[#eef7f2] border border-[#c2ded0] text-[#1b6e44] shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#1b6e44]/40" />
        </Card>

        {/* Card Despesas com Pagas vs Pendentes */}
        <Card padding="md" className="relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="w-full min-w-0 pr-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64756a]">
                Despesas do Mês
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#b33a3a] tabular-nums mt-1.5">
                {formatCurrency(summary.totalExpense)}
              </h3>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0] tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1b6e44]" />
                  Pagas: {formatCurrency(summary.paidExpense)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#fef7ee] text-[#b86214] border border-[#f5dfc6] tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b86214]" />
                  Pendentes: {formatCurrency(summary.pendingExpense)}
                </span>
              </div>
            </div>
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-[#fdf4f4] border border-[#f5cece] text-[#b33a3a] shrink-0">
              <TrendingDown className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#b33a3a]/40" />
        </Card>

        {/* Card Saldo do Mês */}
        <Card padding="md" className="relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64756a]">
                Saldo do Mês
              </span>
              <h3
                className={`text-2xl sm:text-3xl font-bold tabular-nums mt-1.5 ${
                  summary.balance >= 0 ? "text-[#236344]" : "text-[#b33a3a]"
                }`}
              >
                {formatCurrency(summary.balance)}
              </h3>
              <p className="text-[11px] text-[#64756a] mt-2 font-medium tabular-nums">
                Realizado:{" "}
                <span className="font-bold text-[#1b2920]">
                  {formatCurrency(summary.realizedBalance)}
                </span>{" "}
                (já liquidado)
              </p>
            </div>
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-[#f4efe6] border border-[#ded7cb] text-[#236344] shrink-0">
              <Wallet className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div
            className={`absolute bottom-0 inset-x-0 h-1 ${
              summary.balance >= 0 ? "bg-[#236344]/40" : "bg-[#b33a3a]/40"
            }`}
          />
        </Card>
      </div>

      {/* 3. Gráfico SVG Puro de Evolução Anual Interativo */}
      <Card padding="md">
        <AnnualEvolutionChart
          data={monthlyHistory}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onSelectMonth={(m) => setPeriod(m, selectedYear)}
        />
      </Card>

      {/* 4. Grid de Conteúdo Principal: Transações Recentes + Cartões & Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Coluna da Esquerda (2/3): Transações Recentes do Mês */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <CardHeader
              title="Transações Recentes"
              subtitle={`Lançamentos de ${periodLabel}`}
              action={
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#236344] hover:underline"
                >
                  <span>Ver todas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            />

            <RecentTransactionsWidget
              transactions={recentTransactions}
              onTogglePaid={handleTogglePaid}
              onEdit={openEditTransaction}
            />
          </Card>
        </div>

        {/* Coluna da Direita (1/3): Categorias e Cartões de Crédito */}
        <div className="space-y-6">
          {/* Gastos por Categoria com Donut SVG */}
          <Card padding="md">
            <CardHeader
              title="Despesas por Categoria"
              subtitle={formatCurrency(summary.totalExpense)}
              action={<PieChart className="w-4 h-4 text-[#64756a]" />}
            />

            <CategoryDistribution
              categoryTotals={categoryTotals}
              totalExpense={summary.totalExpense}
            />
          </Card>

          {/* Cartões de Crédito e Faturas */}
          <Card padding="md">
            <CardHeader
              title="Cartões e Limites"
              subtitle="Controle de faturas e limite"
              action={
                <Link
                  to="/planning"
                  className="text-xs font-bold text-[#236344] hover:underline"
                >
                  Gerenciar
                </Link>
              }
            />

            <CreditCardsWidget
              cards={cardsList}
              cardTotals={cardTotals}
              cardUnpaidTotals={cardUnpaidTotals}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onRefresh={triggerRefresh}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

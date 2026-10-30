import { formatCurrency, formatDate } from "../utils/formatters";
import type { Transaction } from "../types/Transaction";
import { Fragment } from "react";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onOpenModal: () => void;
  onTogglePaid?: (transaction: Transaction) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onlyType: "all" | "income" | "expense";
  onTypeChange: (value: "all" | "income" | "expense") => void;
  status: "all" | "paid" | "pending";
  onStatusChange: (value: "all" | "paid" | "pending") => void;
  categories: string[];
  cards: string[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedCard: string;
  onCardChange: (value: string) => void;
  groupMode: GroupMode;
  onGroupModeChange: (value: GroupMode) => void;
}

export type GroupMode = "list" | "card" | "category";

function displayName(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  onOpenModal,
  onTogglePaid,
  search,
  onSearchChange,
  onlyType,
  onTypeChange,
  status,
  onStatusChange,
  categories,
  cards,
  selectedCategory,
  onCategoryChange,
  selectedCard,
  onCardChange,
  groupMode,
  onGroupModeChange,
}: TransactionTableProps) {
  const groupedTransactions = groupMode === "list"
    ? [["Todas as transações", transactions] as const]
    : Object.entries(transactions.reduce<Record<string, Transaction[]>>((groups, transaction) => {
        const key = groupMode === "card" ? transaction.card || "Sem cartão" : transaction.category;
        (groups[key] ||= []).push(transaction);
        return groups;
      }, {})).sort(([first], [second]) => {
        if (groupMode === "card") {
          if (first === "Sem cartão") return 1;
          if (second === "Sem cartão") return -1;
        }
        return first.localeCompare(second);
      });

  const hasFilters = Boolean(search || selectedCategory || selectedCard || onlyType !== "all" || status !== "all");

  return (
    <section className="surface overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Transações</h2>
          <p className="mt-1 text-xs text-slate-500">{transactions.length} encontradas neste período</p>
        </div>
        <button
          onClick={onOpenModal}
          className="bg-[#2454a6] hover:bg-[#1c4386] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          + Nova Transação
        </button>
      </div>
      <div className="border-b border-gray-200 bg-[#fafbfd] p-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-2 text-slate-400" aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar descrição, categoria ou cartão"
                aria-label="Buscar transações"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]"
              />
            </div>
            <select value={onlyType} onChange={(event) => onTypeChange(event.target.value as "all" | "income" | "expense")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]">
              <option value="all">Todos os tipos</option>
              <option value="income">Somente receitas</option>
              <option value="expense">Somente despesas</option>
            </select>
            <select value={status} onChange={(event) => onStatusChange(event.target.value as "all" | "paid" | "pending")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]">
              <option value="all">Todos os status</option>
              <option value="paid">Somente pagas</option>
              <option value="pending">Somente pendentes</option>
            </select>
            <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]">
              <option value="">Todas as categorias</option>
              {categories.map((item) => <option key={item} value={item}>{displayName(item)}</option>)}
            </select>
            <select value={selectedCard} onChange={(event) => onCardChange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2454a6] focus:ring-2 focus:ring-[#c8d9f5]">
              <option value="">Todos os cartões</option>
              {cards.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtrar por status">
                <span className="self-center text-xs font-semibold text-slate-500">Status:</span>
                {([
                  ["all", "Todas"],
                  ["paid", " Pagas"],
                  ["pending", " Pendentes"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onStatusChange(value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      status === value
                        ? value === "paid"
                          ? "bg-emerald-600 text-white"
                          : value === "pending"
                          ? "bg-amber-600 text-white"
                          : "bg-[#2454a6] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5" aria-label="Agrupar transações">
                <span className="self-center text-xs font-semibold text-slate-500">Exibir:</span>
                {([["list", "Lista"], ["card", "Por cartão"], ["category", "Por categoria"]] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => onGroupModeChange(value)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${groupMode === value ? "bg-[#2454a6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button type="button" onClick={() => { onSearchChange(""); onTypeChange("all"); onStatusChange("all"); onCategoryChange(""); onCardChange(""); }} className="text-xs font-semibold text-[#2454a6] hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
              <th className="p-4 font-medium">Descrição</th>
              <th className="p-4 font-medium">Data</th>
              <th className="p-4 font-medium text-right">Valor</th>
              <th className="p-4 font-medium text-center">Status</th>
              <th className="p-4 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Nenhuma transação encontrada neste período.
                </td>
              </tr>
            ) : (
              groupedTransactions.map(([group, groupTransactions]) => (
                <Fragment key={group}>
                  {groupMode !== "list" && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                        {groupMode === "card" ? `💳 ${displayName(group)}` : `🏷️ ${displayName(group)}`}
                        <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">{groupTransactions.length} {groupTransactions.length === 1 ? "transação" : "transações"}</span>
                      </td>
                    </tr>
                  )}
                  {groupTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{t.description}</span>
                      {t.card && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          💳 {t.card === "mercado_pago" ? "Mercado Pago" : t.card}
                        </span>
                      )}
                    </div>
                    <span className="block text-xs text-gray-500 capitalize">
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{formatDate(t.date)}</td>
                  <td
                    className={`p-4 font-bold text-right ${
                      t.type === "income" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
                  </td>
                  <td className="p-4 text-center">
                    {t.type === "expense" ? (
                      <button
                        onClick={() => onTogglePaid?.(t)}
                        title={t.is_paid ? "Clique para marcar como pendente" : "Clique para marcar como paga"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity ${
                          onTogglePaid ? "cursor-pointer hover:opacity-75 active:opacity-60" : "cursor-default"
                        } ${
                          t.is_paid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            t.is_paid ? "bg-emerald-600" : "bg-amber-500"
                          }`}
                        />
                        {t.is_paid ? "Paga" : "Pendente"}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                        Recebido
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center space-x-3">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-blue-500 hover:text-blue-700 transition"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(t)}
                      className="text-red-400 hover:text-red-600 transition"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

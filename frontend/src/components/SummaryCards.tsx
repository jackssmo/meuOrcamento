import { formatCurrency } from "../utils/formatters";

interface SummaryCardsProps {
  income: number;
  expense: number;
  balance: number;
  paidExpense?: number;
  pendingExpense?: number;
  activeStatus?: "all" | "paid" | "pending";
  onSelectStatus?: (status: "all" | "paid" | "pending") => void;
}

export function SummaryCards({
  income,
  expense,
  balance,
  paidExpense = 0,
  pendingExpense = 0,
  activeStatus = "all",
  onSelectStatus,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="surface stat-card stat-card-income">
        <div className="stat-card-icon stat-card-icon-income" aria-hidden="true">↑</div>
        <div>
          <p className="stat-label">Receitas</p>
          <h3 className="stat-value text-emerald-600">{formatCurrency(income)}</h3>
        </div>
      </div>
      <div className="surface stat-card stat-card-expense">
        <div className="stat-card-icon stat-card-icon-expense" aria-hidden="true">↓</div>
        <div className="w-full">
          <p className="stat-label">Despesas</p>
          <h3 className="stat-value text-red-600">{formatCurrency(expense)}</h3>
          {(paidExpense > 0 || pendingExpense > 0) && (
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => onSelectStatus?.(activeStatus === "paid" ? "all" : "paid")}
                title="Clique para filtrar apenas despesas pagas"
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition cursor-pointer ${
                  activeStatus === "paid"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeStatus === "paid" ? "bg-white" : "bg-emerald-500"}`} />
                Pagas: {formatCurrency(paidExpense)}
              </button>
              <button
                type="button"
                onClick={() => onSelectStatus?.(activeStatus === "pending" ? "all" : "pending")}
                title="Clique para filtrar apenas despesas pendentes"
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition cursor-pointer ${
                  activeStatus === "pending"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeStatus === "pending" ? "bg-white" : "bg-amber-500"}`} />
                Pendentes: {formatCurrency(pendingExpense)}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="surface stat-card">
        <div>
          <p className="stat-label">Saldo total</p>
          <h3 className={`stat-value ${balance >= 0 ? "text-[#2454a6]" : "text-red-600"}`}>{formatCurrency(balance)}</h3>
        </div>
      </div>
    </div>
  );
}

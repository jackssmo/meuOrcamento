import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  SlidersHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFinancial } from "../../hooks/useFinancial";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/planning", label: "Planejamento", icon: Target },
  { to: "/settings", label: "Conta e Ajustes", icon: SlidersHorizontal },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { openNewTransaction } = useFinancial();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(isCollapsed));
  }, [isCollapsed]);

  function handleLogout() {
    signOut();
    navigate("/login");
  }

  return (
    <aside
      className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-[#152e22] text-[#dbe9e0] border-r border-[#1f3d30] transition-all duration-200 select-none ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Botão de recolher/expandir */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="absolute -right-3 top-7 z-40 grid place-items-center w-6 h-6 rounded-full bg-white text-[#236344] border border-[#c8d9ce] shadow-md hover:bg-[#f4efe6] transition-transform cursor-pointer"
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Marca / Identidade Editorial */}
      <div className={`flex items-center gap-3 p-6 ${isCollapsed ? "justify-center px-2" : ""}`}>
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-[#236344] text-[#e8f4ed] shadow-xs shrink-0">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              Meu Orçamento
            </h1>
            <p className="text-[11px] text-[#a2bdac] mt-1 font-medium tracking-wide uppercase">
              Gestão Pessoal
            </p>
          </div>
        )}
      </div>

      {/* Botão de Ação Rápida: Nova Transação */}
      <div className={`px-4 mb-4 ${isCollapsed ? "px-2" : ""}`}>
        <button
          type="button"
          onClick={() => openNewTransaction("expense")}
          className={`w-full flex items-center justify-center gap-2 bg-[#236344] hover:bg-[#1a4e35] text-white font-semibold rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] ${
            isCollapsed ? "h-11 p-0" : "py-3 px-4"
          }`}
          title="Adicionar nova transação"
        >
          <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
          {!isCollapsed && <span className="text-sm">Nova Transação</span>}
        </button>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#ffffff14] text-white font-semibold shadow-xs"
                    : "text-[#a2bdac] hover:text-white hover:bg-[#ffffff0c]"
                } ${isCollapsed ? "justify-center px-0" : ""}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Rodapé da Sidebar: Usuário e Sair */}
      <div className="p-3 border-t border-[#1f3d30]">
        <div
          className={`flex items-center gap-3 p-2.5 rounded-xl bg-[#ffffff08] ${
            isCollapsed ? "justify-center p-2" : ""
          }`}
        >
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-[#236344] text-white text-xs font-bold shrink-0">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || "Usuário"}
              </p>
              <p className="text-[10px] text-[#a2bdac] truncate">
                {user?.email || "Conta ativa"}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-[#a2bdac] hover:text-white hover:bg-[#ffffff10] rounded-lg transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

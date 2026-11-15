import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { useFinancial } from "../../hooks/useFinancial";

export function BottomTabBar() {
  const { openNewTransaction } = useFinancial();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fbf9f4]/95 backdrop-blur-lg border-t border-[#e8e1d5] px-2 pb-[env(safe-area-inset-bottom,0.5rem)] pt-1.5 shadow-[0_-4px_16px_rgba(27,41,32,0.04)] select-none"
      aria-label="Navegação móvel"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto relative">
        {/* Destino 1: Visão Geral */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive ? "text-[#236344] font-bold" : "text-[#64756a] hover:text-[#1b2920]"
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] mt-1 tracking-tight">Geral</span>
        </NavLink>

        {/* Destino 2: Transações */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive ? "text-[#236344] font-bold" : "text-[#64756a] hover:text-[#1b2920]"
            }`
          }
        >
          <ArrowLeftRight className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] mt-1 tracking-tight">Extrato</span>
        </NavLink>

        {/* Botão Central Elevado: Nova Transação */}
        <div className="flex flex-col items-center justify-center px-1 -mt-5">
          <button
            type="button"
            onClick={() => openNewTransaction("expense")}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#236344] text-white shadow-[0_4px_12px_rgba(35,99,68,0.35)] active:scale-95 transition-transform cursor-pointer border-2 border-[#fbf9f4]"
            aria-label="Adicionar nova transação"
            title="Nova Transação"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-semibold text-[#236344] mt-0.5 tracking-tight">Novo</span>
        </div>

        {/* Destino 3: Planejamento */}
        <NavLink
          to="/planning"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive ? "text-[#236344] font-bold" : "text-[#64756a] hover:text-[#1b2920]"
            }`
          }
        >
          <Target className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] mt-1 tracking-tight">Planejar</span>
        </NavLink>

        {/* Destino 4: Ajustes */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
              isActive ? "text-[#236344] font-bold" : "text-[#64756a] hover:text-[#1b2920]"
            }`
          }
        >
          <SlidersHorizontal className="w-5 h-5 stroke-[1.9]" />
          <span className="text-[10px] mt-1 tracking-tight">Ajustes</span>
        </NavLink>
      </div>
    </nav>
  );
}

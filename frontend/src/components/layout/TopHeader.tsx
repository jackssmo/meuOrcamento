import { useLocation, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PeriodSelector } from "../ui/PeriodSelector";
import { useFinancial } from "../../hooks/useFinancial";
import { useAuth } from "../../contexts/AuthContext";

const PAGE_METADATA: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Visão Geral",
    subtitle: "Acompanhe seus indicadores financeiros e fluxo mensal.",
  },
  "/transactions": {
    title: "Transações",
    subtitle: "Extrato detalhado, filtros avançados e controle de faturas.",
  },
  "/planning": {
    title: "Planejamento",
    subtitle: "Gerencie cartões e metas de poupança.",
  },
  "/settings": {
    title: "Conta e Ajustes",
    subtitle: "Gerencie suas informações pessoais e categorias.",
  },
};

export function TopHeader() {
  const location = useLocation();
  const { openNewTransaction } = useFinancial();
  const { user } = useAuth();

  const metadata = PAGE_METADATA[location.pathname] || {
    title: "Meu Orçamento",
    subtitle: "Gestão financeira pessoal com clareza.",
  };

  return (
    <header className="sticky top-0 z-20 bg-[#fbf9f4]/90 backdrop-blur-md border-b border-[#e8e1d5] px-4 sm:px-6 md:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Lado Esquerdo: Título da Página (Desktop) / Marca (Mobile) */}
        <div>
          {/* Mobile Brand */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-[#236344]" />
            <h1 className="text-base font-bold text-[#1b2920] tracking-tight">
              {metadata.title}
            </h1>
          </div>

          {/* Desktop Heading */}
          <div className="hidden md:block">
            <h1 className="text-xl lg:text-2xl font-bold text-[#1b2920] tracking-tight">
              {metadata.title}
            </h1>
            <p className="text-xs text-[#64756a] mt-0.5">
              {metadata.subtitle}
            </p>
          </div>
        </div>

        {/* Lado Direito: Seletor de Período e Ações */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Seletor Global de Período */}
          <PeriodSelector compact />

          {/* Botão de Lançamento no Desktop */}
          <button
            type="button"
            onClick={() => openNewTransaction("expense")}
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#236344] hover:bg-[#1a4e35] text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            title="Lançamento Rápido"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova</span>
          </button>

          {/* Avatar no Mobile */}
          <Link
            to="/settings"
            className="md:hidden grid place-items-center w-8 h-8 rounded-lg bg-[#236344] text-white text-xs font-bold"
            title="Meu Perfil"
          >
            {(user?.name || "U").charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}

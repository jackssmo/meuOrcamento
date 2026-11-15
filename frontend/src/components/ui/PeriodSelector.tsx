import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import { useFinancial } from "../../hooks/useFinancial";
import { MONTH_NAMES, MONTH_SHORT_NAMES } from "../../constants/designSystem";

export function PeriodSelector({ compact = false }: { compact?: boolean }) {
  const {
    selectedMonth,
    selectedYear,
    periodLabel,
    nextMonth,
    prevMonth,
    setPeriod,
    resetToCurrentMonth,
  } = useFinancial();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const isCurrentMonth =
    selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <div className="inline-flex items-center bg-white border border-[#e8e1d5] rounded-xl p-1 shadow-xs">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 sm:p-2 text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer"
          title="Mês anterior"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-[#1b2920] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer select-none"
          title="Selecionar mês e ano"
        >
          <Calendar className="w-3.5 h-3.5 text-[#236344]" />
          <span>{compact ? `${MONTH_SHORT_NAMES[selectedMonth - 1]} ${selectedYear}` : periodLabel}</span>
        </button>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 sm:p-2 text-[#64756a] hover:text-[#1b2920] hover:bg-[#f4efe6] rounded-lg transition-colors cursor-pointer"
          title="Próximo mês"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {!isCurrentMonth && (
          <button
            type="button"
            onClick={resetToCurrentMonth}
            className="hidden sm:inline-flex items-center gap-1 ml-1 px-2 py-1 text-xs font-semibold text-[#236344] bg-[#eef7f2] hover:bg-[#e2f1e8] rounded-lg border border-[#c2ded0] transition-colors cursor-pointer"
            title="Voltar para o mês atual"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Atual</span>
          </button>
        )}
      </div>

      {/* Popover / Dropdown do Seletor */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-[#e8e1d5] shadow-xl p-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#ded7cb]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64756a]">
              Selecionar Período
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPeriod(selectedMonth, selectedYear - 1)}
                className="px-2 py-1 text-xs font-bold text-[#64756a] hover:bg-[#f4efe6] rounded cursor-pointer"
              >
                ‹
              </button>
              <span className="text-sm font-bold text-[#1b2920]">{selectedYear}</span>
              <button
                type="button"
                onClick={() => setPeriod(selectedMonth, selectedYear + 1)}
                className="px-2 py-1 text-xs font-bold text-[#64756a] hover:bg-[#f4efe6] rounded cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, index) => {
              const monthNum = index + 1;
              const isSelected = selectedMonth === monthNum;
              const isCurrent =
                monthNum === today.getMonth() + 1 && selectedYear === today.getFullYear();

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setPeriod(monthNum, selectedYear);
                    setIsOpen(false);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#236344] text-white shadow-xs"
                      : isCurrent
                      ? "bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0]"
                      : "text-[#2b3830] hover:bg-[#f4efe6]"
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#ede7dc] flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                resetToCurrentMonth();
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-[#236344] hover:underline cursor-pointer"
            >
              Ir para mês atual
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#64756a] hover:text-[#1b2920] font-medium cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

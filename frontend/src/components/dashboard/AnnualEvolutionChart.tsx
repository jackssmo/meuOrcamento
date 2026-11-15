import { useState } from "react";
import { formatCurrency } from "../../utils/formatters";
import { MONTH_SHORT_NAMES, MONTH_NAMES } from "../../constants/designSystem";
import type { MonthlyHistoryItem } from "../../types/models";

interface AnnualEvolutionChartProps {
  data: MonthlyHistoryItem[];
  selectedMonth: number;
  selectedYear: number;
  onSelectMonth: (month: number) => void;
}

export function AnnualEvolutionChart({
  data,
  selectedMonth,
  selectedYear,
  onSelectMonth,
}: AnnualEvolutionChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Normalizar array para 12 meses
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const item = data.find((d) => d.month === monthNum);
    return {
      month: monthNum,
      shortName: MONTH_SHORT_NAMES[i],
      fullName: MONTH_NAMES[i],
      income: Number(item?.income || 0),
      expense: Number(item?.expense || 0),
    };
  });

  // Calcular valor máximo para escala do gráfico
  const maxVal = Math.max(
    ...monthsData.flatMap((d) => [d.income, d.expense]),
    100
  );

  // Coordenadas SVG
  const width = 720;
  const height = 200;
  const paddingBottom = 30;
  const paddingTop = 25;
  const chartHeight = height - paddingBottom - paddingTop;
  const barGroupWidth = width / 12;
  const barWidth = 9;

  const activeMonthInfo = monthsData.find(
    (d) => d.month === (hoveredMonth ?? selectedMonth)
  );

  return (
    <div className="w-full select-none">
      {/* Cabeçalho do Gráfico com Legenda e Detalhe Interativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64756a]">
            Evolução em {selectedYear}
          </span>
          {activeMonthInfo && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#1b2920] px-2 py-1 rounded-md bg-[#f4efe6] border border-[#e8e1d5] tabular-nums w-fit">
              <span>{activeMonthInfo.fullName}:</span>
              <span className="whitespace-nowrap text-[#1b6e44]">+{formatCurrency(activeMonthInfo.income)}</span>
              <span className="text-[#64756a]">/</span>
              <span className="whitespace-nowrap text-[#b33a3a]">-{formatCurrency(activeMonthInfo.expense)}</span>
            </div>
          )}
          <p className="text-xs text-[#64756a]">
            Toque em qualquer mês para selecionar o período.
          </p>
        </div>

        {/* Legenda Editorial */}
        <div className="flex items-center gap-4 text-xs font-semibold text-[#64756a]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#236344]" />
            <span>Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#b33a3a]" />
            <span>Despesas</span>
          </div>
        </div>
      </div>

      {/* Área Gráfica SVG Puro Responsivo */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-pointer"
          role="img"
          aria-label={`Gráfico de evolução financeira anual de ${selectedYear}`}
        >
          {/* Linhas de Grade de Fundo Sutis */}
          <line
            x1="0"
            y1={paddingTop}
            x2={width}
            y2={paddingTop}
            stroke="#ded7cb"
            strokeDasharray="4 4"
            strokeWidth="0.8"
            opacity="0.6"
          />
          <line
            x1="0"
            y1={paddingTop + chartHeight / 2}
            x2={width}
            y2={paddingTop + chartHeight / 2}
            stroke="#ded7cb"
            strokeDasharray="4 4"
            strokeWidth="0.8"
            opacity="0.6"
          />
          <line
            x1="0"
            y1={paddingTop + chartHeight}
            x2={width}
            y2={paddingTop + chartHeight}
            stroke="#ded7cb"
            strokeWidth="1"
          />

          {/* Barras e Interações por Mês */}
          {monthsData.map((d, index) => {
            const isSelected = d.month === selectedMonth;
            const isHovered = d.month === hoveredMonth;
            const groupX = index * barGroupWidth;

            // Alturas proporcionais (mínimo de 3px se houver valor > 0 para visibilidade)
            const incomeHeight = d.income > 0 ? Math.max((d.income / maxVal) * chartHeight, 4) : 0;
            const expenseHeight = d.expense > 0 ? Math.max((d.expense / maxVal) * chartHeight, 4) : 0;

            const incomeY = paddingTop + chartHeight - incomeHeight;
            const expenseY = paddingTop + chartHeight - expenseHeight;

            const bar1X = groupX + barGroupWidth / 2 - barWidth - 1.5;
            const bar2X = groupX + barGroupWidth / 2 + 1.5;

            return (
              <g
                key={d.month}
                onClick={() => onSelectMonth(d.month)}
                onMouseEnter={() => setHoveredMonth(d.month)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="transition-opacity duration-150"
              >
                {/* Destaque do Fundo do Mês Selecionado ou Hover */}
                {(isSelected || isHovered) && (
                  <rect
                    x={groupX + 4}
                    y={paddingTop - 6}
                    width={barGroupWidth - 8}
                    height={chartHeight + 12}
                    rx="8"
                    fill={isSelected ? "#236344" : "#f4efe6"}
                    opacity={isSelected ? "0.08" : "0.7"}
                  />
                )}

                {/* Barra de Receita */}
                {incomeHeight > 0 && (
                  <rect
                    x={bar1X}
                    y={incomeY}
                    width={barWidth}
                    height={incomeHeight}
                    rx="3"
                    fill={isSelected ? "#236344" : "#5b8e73"}
                    className="transition-all duration-300 hover:brightness-110"
                  />
                )}

                {/* Barra de Despesa */}
                {expenseHeight > 0 && (
                  <rect
                    x={bar2X}
                    y={expenseY}
                    width={barWidth}
                    height={expenseHeight}
                    rx="3"
                    fill={isSelected ? "#b33a3a" : "#d97e7e"}
                    className="transition-all duration-300 hover:brightness-110"
                  />
                )}

                {/* Rótulo do Mês na Linha X */}
                <text
                  x={groupX + barGroupWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? "fill-[#236344] font-bold"
                      : isHovered
                      ? "fill-[#1b2920]"
                      : "fill-[#64756a]"
                  }`}
                >
                  {d.shortName}
                </text>

                {/* Marcador Dot do Mês Ativo */}
                {isSelected && (
                  <circle
                    cx={groupX + barGroupWidth / 2}
                    cy={height - 2}
                    r="2"
                    fill="#236344"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

import { formatCurrency } from "../../utils/formatters";
import {
  DEFAULT_CATEGORY_LABELS,
  SYSTEM_CATEGORY_COLORS,
} from "../../constants/designSystem";

interface CategoryDistributionProps {
  categoryTotals: Record<string, number>;
  totalExpense: number;
}

function getCategoryColor(index: number): string {
  return SYSTEM_CATEGORY_COLORS[index % SYSTEM_CATEGORY_COLORS.length];
}

export function CategoryDistribution({
  categoryTotals,
  totalExpense,
}: CategoryDistributionProps) {
  const sortedEntries = Object.entries(categoryTotals)
    .filter(([, val]) => val > 0)
    .sort(([, a], [, b]) => b - a);

  if (sortedEntries.length === 0 || totalExpense <= 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs sm:text-sm text-[#64756a]">
          Nenhuma despesa registrada para este mês.
        </p>
      </div>
    );
  }

  // Montar segmentos do Gráfico Donut em SVG Puro
  let cumulativeAngle = 0;
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = sortedEntries.map(([cat, val], idx) => {
    const percentage = val / totalExpense;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += percentage;

    return {
      category: cat,
      value: val,
      percentage: Math.round(percentage * 100),
      color: getCategoryColor(idx),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="space-y-6">
      {/* Gráfico Donut em SVG Puro */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        <div className="relative w-44 h-44 shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            {/* Círculo de fundo cinza/bege */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#f4efe6"
              strokeWidth={strokeWidth}
            />
            {/* Segmentos proporcionais */}
            {donutSegments.map((seg) => (
              <circle
                key={seg.category}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            ))}
          </svg>

          {/* Centro do Donut com Total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64756a]">
              Despesas
            </span>
            <span className="text-sm font-bold text-[#1b2920] tabular-nums mt-0.5">
              {formatCurrency(totalExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Categorias Proporcionais */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {donutSegments.map((item) => {
          const displayName =
            DEFAULT_CATEGORY_LABELS[item.category.toLowerCase()] ||
            item.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

          return (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-[#1b2920] truncate">
                    {displayName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-[#1b2920] tabular-nums">
                    {formatCurrency(item.value)}
                  </span>
                  <span className="text-[#64756a] text-[11px] tabular-nums w-8 text-right font-medium">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Fina */}
              <div className="h-1.5 w-full bg-[#f4efe6] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

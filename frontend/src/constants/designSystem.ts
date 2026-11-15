export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MONTH_SHORT_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  moradia: "Moradia",
  transporte: "Transporte",
  salario: "Salário",
  lazer: "Lazer",
  saude: "Saúde",
  educacao: "Educação",
  assinaturas: "Assinaturas",
  compras: "Compras",
  viagens: "Viagens",
  impostos: "Impostos e taxas",
  investimentos: "Investimentos",
  dividas: "Dívidas",
  outros: "Outros",
};

export const SYSTEM_CATEGORY_COLORS = [
  "#236344",
  "#B33A3A",
  "#2D5A7B",
  "#C68A35",
  "#7C5D8A",
  "#1B6E44",
  "#C45028",
  "#3A7CA5",
  "#8B6914",
  "#6B4C6E",
  "#2E8B6A",
  "#A0522D",
] as const;

export const PALETTE = {
  // Fundos e Superfícies
  bgMain: "#FBF9F4",       // Bege linho quente
  bgSurface: "#FFFFFF",    // Branco puro
  bgParchment: "#F4EFE6",  // Pergaminho suave
  bgSubtle: "#F7F4ED",     // Areia clara
  
  // Bordas
  borderLight: "#E8E1D5",  // Borda areia nítida
  borderMedium: "#DED7CB", // Borda areia estrutural
  
  // Identidade Primária
  forestDeep: "#152E22",   // Verde-floresta estrutural
  forestBorder: "#1F3D30", // Traço sutil do menu floresta
  mossPrimary: "#236344",  // Verde-musgo clássico (ações)
  mossHover: "#1A4E35",    // Hover do botão
  mossFocusRing: "#C8E2D2",// Anel de foco
  
  // Acentos Semânticos
  emeraldIncome: "#1B6E44", // Receitas / positivo
  emeraldBg: "#EEF7F2",
  emeraldBorder: "#C2DED0",
  
  terracottaExpense: "#B33A3A", // Despesas / alerta
  terracottaBg: "#FDF4F4",
  terracottaBorder: "#F5CECE",
  
  amberPending: "#B86214", // Pendências
  amberBg: "#FEF7EE",
  amberBorder: "#F5DFC6",
  
  // Texto
  textHeading: "#1B2920",  // Carvão botânico
  textBody: "#2B3830",     // Texto corrido legível
  textMuted: "#64756A",    // Texto secundário
  textLight: "#A2BDAC",    // Texto suave sobre fundo escuro
};

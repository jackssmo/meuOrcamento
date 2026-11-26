export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(date);
};

export const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numeric = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export const splitAmountInCents = (amount: number, parts: number): number[] => {
  if (parts <= 0) return [];
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / parts);
  const remainder = totalCents % parts;
  return Array.from({ length: parts }, (_, index) => baseCents + (index < remainder ? 1 : 0));
};

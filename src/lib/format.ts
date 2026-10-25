const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("es-AR");

export function formatMoney(value: number) {
  return money.format(value);
}

export function formatNumber(value: number) {
  return number.format(value);
}

export function formatDate(value: Date | string, withTime = false) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export function orderNumber(n: number) {
  return `#${String(n).padStart(5, "0")}`;
}

export const priceTypeLabel: Record<string, string> = {
  NORMAL: "Efectivo",
  TRANSFER: "Transferencia",
  CUSTOM: "Personalizado",
};

export const statusLabel: Record<string, string> = {
  WEB_PENDING: "Web · por aprobar",
  PENDING: "Pendiente de entrega",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

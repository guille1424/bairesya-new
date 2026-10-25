// Reglas de negocio de pedidos, sin acceso a base de datos (testeables con Vitest).

export type PriceTypeValue = "NORMAL" | "TRANSFER" | "CUSTOM";

export class OrderError extends Error {}

export type PricedProduct = {
  name: string;
  priceNormal: number;
  priceTransfer: number;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Precio unitario según el tipo elegido en caja. */
export function unitPrice(product: PricedProduct, priceType: PriceTypeValue, customPrice?: number | null) {
  switch (priceType) {
    case "NORMAL":
      return roundMoney(product.priceNormal);
    case "TRANSFER":
      return roundMoney(product.priceTransfer);
    case "CUSTOM":
      if (customPrice === undefined || customPrice === null || !Number.isFinite(customPrice) || customPrice < 0) {
        throw new OrderError(`Falta un precio personalizado válido para "${product.name}".`);
      }
      return roundMoney(customPrice);
  }
}

/**
 * Divide una cantidad pedida entre lo que hay en stock y lo que queda como pre-pedido
 * (se encarga al proveedor y se entrega después).
 */
export function splitStock(available: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new OrderError("La cantidad debe ser un número entero mayor a cero.");
  }
  const inStock = Math.max(0, Math.min(Math.max(0, available), quantity));
  return { inStock, preOrder: quantity - inStock };
}

export type OrderLine = {
  productId: string;
  barcode: string;
  name: string;
  quantity: number;
  priceAtSale: number;
  costAtSale: number;
  priceType: PriceTypeValue;
  isPreOrder: boolean;
};

/** Arma las líneas de un ítem: una por la parte con stock y otra por la parte en pre-pedido. */
export function buildLines(
  product: PricedProduct & { id: string; barcode: string; cost: number },
  available: number,
  quantity: number,
  priceType: PriceTypeValue,
  customPrice?: number | null,
): OrderLine[] {
  const price = unitPrice(product, priceType, customPrice);
  const { inStock, preOrder } = splitStock(available, quantity);
  const base = {
    productId: product.id,
    barcode: product.barcode,
    name: product.name,
    priceAtSale: price,
    costAtSale: roundMoney(product.cost),
    priceType,
  };
  const lines: OrderLine[] = [];
  if (inStock > 0) lines.push({ ...base, quantity: inStock, isPreOrder: false });
  if (preOrder > 0) lines.push({ ...base, quantity: preOrder, isPreOrder: true });
  return lines;
}

export function linesTotal(lines: Pick<OrderLine, "priceAtSale" | "quantity">[]) {
  return roundMoney(lines.reduce((sum, line) => sum + line.priceAtSale * line.quantity, 0));
}

/** Stock que se puede ofrecer en la tienda: stock físico menos lo reservado por pedidos web pendientes. */
export function availableForWeb(stock: number, reservedByWebOrders: number) {
  return Math.max(0, stock - reservedByWebOrders);
}

export type OrderStatusValue = "WEB_PENDING" | "PENDING" | "DELIVERED" | "CANCELLED";

/** Transiciones de estado permitidas. */
export const transitions: Record<string, OrderStatusValue[]> = {
  approveWeb: ["WEB_PENDING"],
  rejectWeb: ["WEB_PENDING"],
  deliver: ["PENDING"],
  cancel: ["WEB_PENDING", "PENDING"],
  addItems: ["PENDING"],
};

export function assertTransition(action: keyof typeof transitions, status: OrderStatusValue) {
  if (!transitions[action].includes(status)) {
    const messages: Record<string, string> = {
      approveWeb: "Solo se pueden aprobar pedidos web pendientes.",
      rejectWeb: "Solo se pueden rechazar pedidos web pendientes.",
      deliver: "Solo se pueden entregar pedidos pendientes de entrega.",
      cancel: "Este pedido ya no se puede cancelar.",
      addItems: "Solo se pueden agregar prendas a pedidos pendientes.",
    };
    throw new OrderError(messages[action]);
  }
}

/** Al cancelar, solo vuelve al stock lo que se había descontado (ítems sin pre-pedido de pedidos PENDING). */
export function restockOnCancel(
  status: OrderStatusValue,
  items: { productId: string | null; quantity: number; isPreOrder: boolean }[],
) {
  if (status !== "PENDING") return [];
  const byProduct = new Map<string, number>();
  for (const item of items) {
    if (item.isPreOrder || !item.productId) continue;
    byProduct.set(item.productId, (byProduct.get(item.productId) ?? 0) + item.quantity);
  }
  return [...byProduct].map(([productId, quantity]) => ({ productId, quantity }));
}

import { formatMoney, orderNumber } from "./format";

type MessageOrder = {
  number: number;
  customerName: string;
  totalAmount: number;
  items: { name: string; quantity: number }[];
};

function itemsText(items: MessageOrder["items"]) {
  return items.map((i) => `- ${i.name} (${i.quantity} prenda${i.quantity > 1 ? "s" : ""})`).join("\n");
}

/** Aviso al cliente de que el pedido está listo (mismo texto que usaba la app anterior). */
export function orderReadyMessage(order: MessageOrder) {
  return `¡Hola ${order.customerName}! Tu pedido de BairesYa está listo para retirar/entregar. 😊\n\nDetalle:\n${itemsText(order.items)}\n\nTotal: ${formatMoney(order.totalAmount)}\n¡Muchas gracias!`;
}

/** Mensaje que el cliente envía a la tienda al hacer un pedido web. */
export function webOrderMessage(
  order: Omit<MessageOrder, "items"> & { items: { name: string; quantity: number; priceAtSale: number }[] },
) {
  const lines = order.items.map((i) => `- ${i.quantity} x ${i.name} (${formatMoney(i.priceAtSale)})`).join("\n");
  return `¡Hola BairesYa! Soy ${order.customerName} y hice el pedido ${orderNumber(order.number)} en la tienda online:\n\n${lines}\n\nTotal: ${formatMoney(order.totalAmount)}\n\n¿Me confirman disponibilidad y forma de entrega?`;
}

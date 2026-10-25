import { describe, expect, it } from "vitest";
import {
  OrderError,
  assertTransition,
  availableForWeb,
  buildLines,
  linesTotal,
  restockOnCancel,
  splitStock,
  unitPrice,
} from "./orders";

const remera = {
  id: "p1",
  barcode: "779001",
  name: "Remera Oversize",
  cost: 8000,
  priceNormal: 15000,
  priceTransfer: 13500,
};

describe("unitPrice", () => {
  it("usa el precio según el tipo elegido", () => {
    expect(unitPrice(remera, "NORMAL")).toBe(15000);
    expect(unitPrice(remera, "TRANSFER")).toBe(13500);
    expect(unitPrice(remera, "CUSTOM", 12000)).toBe(12000);
  });

  it("exige un precio personalizado válido", () => {
    expect(() => unitPrice(remera, "CUSTOM")).toThrow(OrderError);
    expect(() => unitPrice(remera, "CUSTOM", -1)).toThrow(OrderError);
    expect(() => unitPrice(remera, "CUSTOM", Number.NaN)).toThrow(OrderError);
  });

  it("redondea a centavos", () => {
    expect(unitPrice(remera, "CUSTOM", 10.005)).toBe(10.01);
  });
});

describe("splitStock", () => {
  it("todo en stock cuando alcanza", () => {
    expect(splitStock(5, 3)).toEqual({ inStock: 3, preOrder: 0 });
  });
  it("divide entre stock y pre-pedido cuando no alcanza", () => {
    expect(splitStock(2, 5)).toEqual({ inStock: 2, preOrder: 3 });
  });
  it("todo pre-pedido sin stock (incluso si el stock es negativo)", () => {
    expect(splitStock(0, 4)).toEqual({ inStock: 0, preOrder: 4 });
    expect(splitStock(-3, 2)).toEqual({ inStock: 0, preOrder: 2 });
  });
  it("rechaza cantidades inválidas", () => {
    expect(() => splitStock(5, 0)).toThrow(OrderError);
    expect(() => splitStock(5, 1.5)).toThrow(OrderError);
  });
});

describe("buildLines", () => {
  it("genera una línea con stock y otra en pre-pedido, con costo histórico", () => {
    const lines = buildLines(remera, 1, 3, "TRANSFER");
    expect(lines).toEqual([
      expect.objectContaining({ quantity: 1, isPreOrder: false, priceAtSale: 13500, costAtSale: 8000 }),
      expect.objectContaining({ quantity: 2, isPreOrder: true, priceAtSale: 13500, costAtSale: 8000 }),
    ]);
    expect(linesTotal(lines)).toBe(40500);
  });
});

describe("availableForWeb", () => {
  it("descuenta lo reservado por pedidos web pendientes", () => {
    expect(availableForWeb(5, 2)).toBe(3);
    expect(availableForWeb(1, 4)).toBe(0);
  });
});

describe("transiciones de estado", () => {
  it("permite aprobar/rechazar solo pedidos web pendientes", () => {
    expect(() => assertTransition("approveWeb", "WEB_PENDING")).not.toThrow();
    expect(() => assertTransition("approveWeb", "PENDING")).toThrow(OrderError);
    expect(() => assertTransition("rejectWeb", "DELIVERED")).toThrow(OrderError);
  });
  it("solo se entrega lo pendiente y no se cancela lo entregado", () => {
    expect(() => assertTransition("deliver", "PENDING")).not.toThrow();
    expect(() => assertTransition("deliver", "WEB_PENDING")).toThrow(OrderError);
    expect(() => assertTransition("cancel", "DELIVERED")).toThrow(OrderError);
    expect(() => assertTransition("cancel", "CANCELLED")).toThrow(OrderError);
  });
});

describe("restockOnCancel", () => {
  const items = [
    { productId: "p1", quantity: 2, isPreOrder: false },
    { productId: "p1", quantity: 1, isPreOrder: false },
    { productId: "p1", quantity: 4, isPreOrder: true },
    { productId: "p2", quantity: 1, isPreOrder: false },
    { productId: null, quantity: 1, isPreOrder: false },
  ];
  it("devuelve al stock solo lo descontado de un pedido pendiente", () => {
    expect(restockOnCancel("PENDING", items)).toEqual([
      { productId: "p1", quantity: 3 },
      { productId: "p2", quantity: 1 },
    ]);
  });
  it("un pedido web pendiente no había descontado stock", () => {
    expect(restockOnCancel("WEB_PENDING", items)).toEqual([]);
  });
});

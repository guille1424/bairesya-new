import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getInventoryValue, getSalesByPriceType, monthRange } from "@/lib/data/stats";
import { priceTypeLabel } from "@/lib/format";

const MONEY = '"$"#,##0.00';
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

async function soldItems(from?: Date, to?: Date) {
  const items = await prisma.saleItem.findMany({
    where: { sale: { status: "DELIVERED", date: { gte: from, lt: to } } },
    orderBy: { sale: { date: "asc" } },
    select: {
      barcode: true,
      name: true,
      quantity: true,
      priceAtSale: true,
      costAtSale: true,
      priceType: true,
      sale: { select: { date: true, number: true, customerName: true } },
      product: { select: { category: true, size: true, color: true } },
    },
  });
  return items.map((i) => {
    const price = Number(i.priceAtSale);
    const cost = Number(i.costAtSale);
    return {
      fecha: i.sale.date,
      pedido: i.sale.number,
      cliente: i.sale.customerName,
      codigo: i.barcode,
      producto: i.name,
      categoria: i.product?.category ?? "",
      talle: i.product?.size ?? "",
      color: i.product?.color ?? "",
      cantidad: i.quantity,
      costo: cost,
      tipo: priceTypeLabel[i.priceType],
      precio: price,
      total: price * i.quantity,
      ganancia: (price - cost) * i.quantity,
    };
  });
}

function addSoldSheet(workbook: ExcelJS.Workbook, name: string, rows: Awaited<ReturnType<typeof soldItems>>) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: "Fecha", key: "fecha", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Pedido", key: "pedido", width: 9 },
    { header: "Cliente", key: "cliente", width: 22 },
    { header: "Código", key: "codigo", width: 16 },
    { header: "Producto", key: "producto", width: 30 },
    { header: "Categoría", key: "categoria", width: 14 },
    { header: "Talle", key: "talle", width: 8 },
    { header: "Color", key: "color", width: 12 },
    { header: "Cantidad", key: "cantidad", width: 10 },
    { header: "Costo unit.", key: "costo", width: 13, style: { numFmt: MONEY } },
    { header: "Tipo de venta", key: "tipo", width: 15 },
    { header: "Precio unit.", key: "precio", width: 13, style: { numFmt: MONEY } },
    { header: "Total", key: "total", width: 14, style: { numFmt: MONEY } },
    { header: "Ganancia", key: "ganancia", width: 14, style: { numFmt: MONEY } },
  ];
  sheet.addRows(rows);
  styleHeader(sheet);
}

export async function monthlyReport(year: number, month: number) {
  const { from, to } = monthRange(year, month);
  const [rows, sales] = await Promise.all([soldItems(from, to), getSalesByPriceType(from, to)]);
  const orders = new Set(rows.map((r) => r.pedido)).size;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BairesYa";
  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [
    { header: "Concepto", key: "k", width: 28 },
    { header: "Valor", key: "v", width: 18 },
  ];
  summary.addRows([
    { k: "Período", v: `${months[month - 1]} ${year}` },
    { k: "Pedidos entregados", v: orders },
    { k: "Prendas vendidas", v: sales.total.units },
    { k: "Ingresos", v: sales.total.revenue },
    { k: "Costo", v: sales.total.cost },
    { k: "Ganancia", v: sales.total.profit },
    {},
    ...(["NORMAL", "TRANSFER", "CUSTOM"] as const).map((t) => ({ k: `Ingresos ${priceTypeLabel[t]}`, v: sales.byType[t].revenue })),
  ]);
  summary.getColumn("v").numFmt = MONEY;
  summary.getCell("B2").numFmt = "@";
  summary.getCell("B3").numFmt = "0";
  summary.getCell("B4").numFmt = "0";
  styleHeader(summary);
  addSoldSheet(workbook, "Detalle de ventas", rows);

  return { workbook, filename: `reporte_${String(month).padStart(2, "0")}_${year}.xlsx` };
}

export async function fullReport() {
  const [rows, sales, inventory, products] = await Promise.all([
    soldItems(),
    getSalesByPriceType(),
    getInventoryValue(),
    prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BairesYa";

  const stats = workbook.addWorksheet("Estadísticas");
  stats.columns = [
    { header: "Concepto", key: "k", width: 30 },
    { header: "Prendas", key: "u", width: 12 },
    { header: "Ingresos", key: "r", width: 16, style: { numFmt: MONEY } },
    { header: "Costo", key: "c", width: 16, style: { numFmt: MONEY } },
    { header: "Ganancia", key: "p", width: 16, style: { numFmt: MONEY } },
  ];
  for (const t of ["NORMAL", "TRANSFER", "CUSTOM"] as const) {
    const s = sales.byType[t];
    stats.addRow({ k: `Ventas ${priceTypeLabel[t]}`, u: s.units, r: s.revenue, c: s.cost, p: s.profit });
  }
  stats.addRow({ k: "Total vendido", u: sales.total.units, r: sales.total.revenue, c: sales.total.cost, p: sales.total.profit }).font = { bold: true };
  stats.addRow({});
  stats.addRow({ k: "Inventario disponible (a costo)", u: inventory.units, c: inventory.cost });
  stats.addRow({ k: "Inventario a precio efectivo", u: inventory.units, r: inventory.normal, p: inventory.normal - inventory.cost });
  stats.addRow({ k: "Inventario a precio transferencia", u: inventory.units, r: inventory.transfer, p: inventory.transfer - inventory.cost });
  styleHeader(stats);

  const available = workbook.addWorksheet("Disponibles");
  available.columns = [
    { header: "Código", key: "barcode", width: 16 },
    { header: "Producto", key: "name", width: 30 },
    { header: "Categoría", key: "category", width: 14 },
    { header: "Talle", key: "size", width: 8 },
    { header: "Color", key: "color", width: 12 },
    { header: "Stock", key: "stock", width: 8 },
    { header: "Costo", key: "cost", width: 13, style: { numFmt: MONEY } },
    { header: "Precio efectivo", key: "priceNormal", width: 15, style: { numFmt: MONEY } },
    { header: "Precio transferencia", key: "priceTransfer", width: 18, style: { numFmt: MONEY } },
    { header: "Margen efectivo", key: "mn", width: 15, style: { numFmt: MONEY } },
    { header: "Margen transferencia", key: "mt", width: 18, style: { numFmt: MONEY } },
    { header: "Proveedor", key: "supplierName", width: 18 },
  ];
  available.addRows(
    products.map((p) => ({
      ...p,
      cost: Number(p.cost),
      priceNormal: Number(p.priceNormal),
      priceTransfer: Number(p.priceTransfer),
      mn: Number(p.priceNormal) - Number(p.cost),
      mt: Number(p.priceTransfer) - Number(p.cost),
    })),
  );
  styleHeader(available);

  addSoldSheet(workbook, "Vendidos", rows);
  const today = new Date().toISOString().slice(0, 10);
  return { workbook, filename: `reporte_historico_${today}.xlsx` };
}

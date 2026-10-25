import { getStaff } from "@/lib/auth/dal";
import { currentYearMonth } from "@/lib/data/stats";
import { fullReport, monthlyReport } from "@/lib/reports";

export async function GET(request: Request, { params }: RouteContext<"/api/reportes/[tipo]">) {
  const staff = await getStaff();
  if (!staff) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (staff.role !== "ADMIN") return Response.json({ error: "Solo administradores" }, { status: 403 });

  const { tipo } = await params;
  let report;
  if (tipo === "mensual") {
    const url = new URL(request.url);
    const now = currentYearMonth();
    const month = Number(url.searchParams.get("month")) || now.month;
    const year = Number(url.searchParams.get("year")) || now.year;
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return Response.json({ error: "Período inválido" }, { status: 400 });
    }
    report = await monthlyReport(year, month);
  } else if (tipo === "historico") {
    report = await fullReport();
  } else {
    return Response.json({ error: "Reporte inexistente" }, { status: 404 });
  }

  const buffer = await report.workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function ReportDownloads({ year, month }: { year: number; month: number }) {
  const [selMonth, setSelMonth] = useState(String(month));
  const [selYear, setSelYear] = useState(String(year));
  const years = Array.from({ length: 5 }, (_, i) => String(year - i));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selMonth} onValueChange={setSelMonth}>
          <SelectTrigger className="w-36" aria-label="Mes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selYear} onValueChange={setSelYear}>
          <SelectTrigger className="w-24" aria-label="Año">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild>
          <a href={`/api/reportes/mensual?month=${selMonth}&year=${selYear}`} download>
            <Download /> Reporte mensual
          </a>
        </Button>
      </div>
      <Button variant="outline" asChild className="w-fit">
        <a href="/api/reportes/historico" download>
          <FileSpreadsheet /> Reporte histórico completo
        </a>
      </Button>
    </div>
  );
}

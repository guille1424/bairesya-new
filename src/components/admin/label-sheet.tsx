"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

type Label = {
  id: string;
  barcode: string;
  name: string;
  size: string | null;
  color: string | null;
  priceNormal: number;
  priceTransfer: number;
};

/** Etiquetas de 80 × 80 mm (mismo formato que la app anterior), una por página al imprimir. */
export function LabelSheet({ labels }: { labels: Label[] }) {
  return (
    <div className="min-h-svh bg-muted/40 print:bg-white">
      <style>{`@page { size: 80mm 80mm; margin: 0; }`}</style>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background px-6 py-3 print:hidden">
        <div>
          <h1 className="font-semibold">Etiquetas</h1>
          <p className="text-sm text-muted-foreground">
            {labels.length} etiqueta{labels.length !== 1 && "s"} de 80 × 80 mm. Elegí la impresora térmica y tamaño &quot;80mm&quot;.
          </p>
        </div>
        <Button onClick={() => window.print()} disabled={labels.length === 0}>
          <Printer /> Imprimir
        </Button>
      </div>
      <div className="flex flex-wrap justify-center gap-6 p-6 print:block print:p-0">
        {labels.length === 0 && <p className="text-muted-foreground">No hay productos seleccionados.</p>}
        {labels.map((label) => (
          <LabelCard key={label.id} label={label} />
        ))}
      </div>
    </div>
  );
}

function LabelCard({ label }: { label: Label }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, label.barcode, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 16,
        margin: 6,
      });
    } catch {
      // Código con caracteres no soportados: se muestra solo el texto.
    }
  }, [label.barcode]);

  const details = [label.size && `TALLE: ${label.size}`, label.color && `COLOR: ${label.color}`].filter(Boolean).join(" | ");

  return (
    <div className="flex size-[80mm] break-after-page flex-col items-center justify-center bg-white p-[10px] text-center text-black shadow-sm print:shadow-none">
      <div className="w-[90%] border-b-2 border-black pb-0.5 text-base font-extrabold tracking-[2px]">BAIRESYA</div>
      <div className="mt-1 w-full truncate text-sm font-bold uppercase">{label.name}</div>
      {details && <div className="text-[11px] font-medium uppercase">{details}</div>}
      <svg ref={svgRef} className="my-1.5 h-auto w-[240px]" />
      <div className="text-[11px] leading-tight font-bold">
        EFECTIVO: {formatMoney(label.priceNormal)}
        <br />
        TRANSFERENCIA: {formatMoney(label.priceTransfer)}
      </div>
    </div>
  );
}

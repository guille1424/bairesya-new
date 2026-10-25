"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useActionForm } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyImport, previewImport, type PreviewRow } from "@/lib/actions/import";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusBadge: Record<PreviewRow["status"], React.ReactNode> = {
  create: <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Nuevo</Badge>,
  update: <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400">Actualiza</Badge>,
  error: <Badge variant="destructive">Error</Badge>,
};

export function ImportWizard() {
  const { state, pending, onSubmit } = useActionForm(previewImport);
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const [applying, startApply] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = state.rows && state !== dismissed ? state : null;
  const validRows = preview?.rows?.filter((r) => r.status !== "error" && r.data) ?? [];

  function reset() {
    setDismissed(state);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function submitFile(files: FileList | null) {
    if (!files?.length || !inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(files[0]);
    inputRef.current.files = dt.files;
    setDone(null);
    formRef.current?.requestSubmit();
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <p className="text-lg font-medium">{done}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              <RotateCcw /> Importar otro archivo
            </Button>
            <Button asChild>
              <Link href="/admin/inventario?sort=-updated">Ver inventario</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (preview?.rows && preview.summary) {
    const { summary } = preview;
    return (
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Revisá antes de importar</CardTitle>
          <CardDescription>
            Hoja &quot;{preview.sheet}&quot;: {summary.create} nuevos · {summary.update} se actualizan (el stock se reemplaza por el
            del archivo) · {summary.error} con errores (se omiten).
          </CardDescription>
        </CardHeader>
        <div className="max-h-[480px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead className="w-14">Fila</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Efectivo</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((r) => (
                <TableRow key={r.row} className={cn(r.status === "error" && "bg-destructive/5")}>
                  <TableCell className="text-muted-foreground tabular-nums">{r.row}</TableCell>
                  <TableCell>{statusBadge[r.status]}</TableCell>
                  <TableCell className="font-mono text-xs">{r.barcode || "—"}</TableCell>
                  <TableCell className="max-w-56 truncate">{r.name || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.data?.stock ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.data ? formatMoney(r.data.priceNormal) : "—"}</TableCell>
                  <TableCell className="text-xs text-destructive">{r.errors.join(" · ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <CardFooter className="justify-end gap-2 border-t py-4">
          <Button variant="outline" onClick={reset} disabled={applying}>
            Elegir otro archivo
          </Button>
          <Button
            disabled={validRows.length === 0 || applying}
            onClick={() =>
              startApply(async () => {
                const result = await applyImport(validRows.map((r) => r.data));
                if (result.error) toast.error(result.error);
                else setDone(result.message ?? "Importación lista.");
              })
            }
          >
            {applying ? <Spinner /> : <Upload />}
            Importar {validRows.length} producto{validRows.length !== 1 && "s"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input ref={inputRef} type="file" name="file" accept=".xlsx" hidden onChange={(e) => submitFile(e.target.files)} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          submitFile(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {pending ? <Spinner className="size-5" /> : <FileSpreadsheet className="size-6" />}
        </span>
        <div>
          <p className="font-medium">{pending ? "Leyendo el archivo…" : "Arrastrá tu Excel acá"}</p>
          <p className="text-sm text-muted-foreground">o elegilo desde la computadora (.xlsx, hasta 2000 filas)</p>
        </div>
        <Button type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
          Seleccionar archivo
        </Button>
        {state.error && state !== dismissed && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

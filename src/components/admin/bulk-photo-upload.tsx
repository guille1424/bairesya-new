"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { CheckCircle2, CircleAlert, FolderUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attachUploadedPhotos, planPhotoUpload, type PhotoPlanRow } from "@/lib/actions/photos";

const CONCURRENCY = 4;

const statusBadge: Record<PhotoPlanRow["status"], React.ReactNode> = {
  match: <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Se sube</Badge>,
  new: <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Sin producto</Badge>,
  duplicate: <Badge variant="outline">Repetida</Badge>,
  too_big: <Badge variant="destructive">Muy pesada</Badge>,
  invalid: <Badge variant="outline">Se ignora</Badge>,
};

function detail(row: PhotoPlanRow) {
  switch (row.status) {
    case "match":
      return `${row.product} · ${row.position ? `foto ${row.position + 1}` : "portada"}`;
    case "new":
      return "Se sube y se vincula al importar el Excel con ese código";
    case "duplicate":
      return "Ya hay otro archivo para esa foto del producto";
    case "too_big":
      return "Tiene más de 8 MB";
    case "invalid":
      return "El nombre tiene que ser <código>.jpg o <código>_2.jpg";
  }
}

type Result = { ok: boolean; message: string; failed: string[] };

/** Sube todas las fotos de una carpeta: cada archivo se llama como el código de barras del producto. */
export function BulkPhotoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useRef<File[]>([]);
  const [rows, setRows] = useState<PhotoPlanRow[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [planning, startPlanning] = useTransition();

  const toUpload = rows?.filter((r) => r.status === "match" || r.status === "new") ?? [];
  const uploading = progress !== null && result === null;

  function pick(list: FileList | null) {
    if (!list?.length) return;
    files.current = [...list];
    if (inputRef.current) inputRef.current.value = "";
    startPlanning(async () => {
      const plan = await planPhotoUpload(files.current.map((f) => ({ name: f.name, size: f.size })));
      if (plan.error) toast.error(plan.error);
      else setRows(plan.rows ?? []);
    });
  }

  async function start() {
    const queue = [...toUpload];
    const uploaded: { pathname: string; url: string }[] = [];
    const failed: string[] = [];
    setProgress({ done: 0, total: queue.length });
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let row = queue.shift(); row; row = queue.shift()) {
          const file = files.current[row.index];
          try {
            const blob = await upload(row.pathname!, file, {
              access: "public",
              handleUploadUrl: "/api/upload",
              contentType: file.type || undefined,
              clientPayload: "masiva",
            });
            uploaded.push({ pathname: blob.pathname, url: blob.url });
          } catch (err) {
            console.error(err);
            failed.push(row.name);
          }
          setProgress((p) => p && { ...p, done: p.done + 1 });
        }
      }),
    );
    if (uploaded.length === 0) {
      setResult({ ok: false, message: "No se pudo subir ninguna foto.", failed });
      return;
    }
    const res = await attachUploadedPhotos(uploaded);
    setResult({ ok: !res.error, message: res.error ?? res.message ?? "Fotos subidas.", failed });
  }

  function close() {
    if (uploading) return;
    setRows(null);
    setProgress(null);
    setResult(null);
    files.current = [];
  }

  const counts = (status: PhotoPlanRow["status"][]) => rows?.filter((r) => status.includes(r.status)).length ?? 0;

  return (
    <>
      <input
        ref={(el) => {
          inputRef.current = el;
          // Permite elegir una carpeta entera (no está en los tipos de React).
          el?.setAttribute("webkitdirectory", "");
        }}
        type="file"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <Button variant="outline" disabled={planning} onClick={() => inputRef.current?.click()}>
        {planning ? <Spinner /> : <FolderUp />} Subir fotos
      </Button>

      <Dialog open={rows !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-3xl" showCloseButton={!uploading}>
          <DialogHeader>
            <DialogTitle>Subir fotos de la carpeta</DialogTitle>
            <DialogDescription>
              Cada foto se llama como el código de barras: 01000602M.jpg es la portada y 01000602M_2.jpg … _8 las
              siguientes. Una foto con el mismo nombre reemplaza a la anterior.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              {result.ok ? (
                <CheckCircle2 className="size-10 text-emerald-600" />
              ) : (
                <CircleAlert className="size-10 text-destructive" />
              )}
              <p className="font-medium">{result.message}</p>
              {result.failed.length > 0 && (
                <p className="text-sm text-destructive">
                  No se pudieron subir {result.failed.length}: {result.failed.slice(0, 10).join(", ")}
                  {result.failed.length > 10 && "…"}
                </p>
              )}
            </div>
          ) : progress ? (
            <div className="space-y-3 py-6">
              <p className="text-sm">
                Subiendo {progress.done} de {progress.total} fotos… No cierres esta ventana.
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {counts(["match"])} para productos cargados · {counts(["new"])} sin producto todavía ·{" "}
                {counts(["duplicate", "too_big", "invalid"])} no se suben
              </p>
              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-popover">
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Destino</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows?.map((r) => (
                      <TableRow key={r.index}>
                        <TableCell className="max-w-48 truncate font-mono text-xs">{r.name}</TableCell>
                        <TableCell>{statusBadge[r.status]}</TableCell>
                        <TableCell className="text-xs whitespace-normal text-muted-foreground">{detail(r)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={close}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={close} disabled={uploading}>
                  Cancelar
                </Button>
                <Button onClick={start} disabled={toUpload.length === 0 || uploading}>
                  {uploading ? <Spinner /> : <Upload />}
                  Subir {toUpload.length} foto{toUpload.length !== 1 && "s"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CameraOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

/** Escáner de códigos con la cámara (html5-qrcode se carga solo al abrir el diálogo). */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear con la cámara</DialogTitle>
          <DialogDescription>Apuntá al código de barras o QR de la etiqueta. Podés escanear varias prendas seguidas.</DialogDescription>
        </DialogHeader>
        {open && <CameraView onScan={onScan} />}
      </DialogContent>
    </Dialog>
  );
}

function CameraView({ onScan }: { onScan: (code: string) => void }) {
  const id = useId().replace(/:/g, "");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const last = useRef({ code: "", at: 0 });
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(`reader-${id}`, {
        verbose: false,
        formatsToSupport: [F.CODE_128, F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_39, F.QR_CODE],
      });
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (text) => {
            // Evita sumar dos veces la misma prenda por lecturas repetidas.
            const now = Date.now();
            if (text === last.current.code && now - last.current.at < 1500) return;
            last.current = { code: text, at: now };
            navigator.vibrate?.(60);
            onScanRef.current(text);
          },
          () => {},
        );
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, [id]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <div id={`reader-${id}`} className="aspect-[4/3] w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Spinner className="size-6" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white">
          <CameraOff className="size-6" />
          No se pudo acceder a la cámara. Revisá los permisos del navegador.
        </div>
      )}
    </div>
  );
}

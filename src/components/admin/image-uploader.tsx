"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export type UploadedImage = { url: string; pathname: string };

const MAX_IMAGES = 8;

export function ImageUploader({ name, defaultValue }: { name: string; defaultValue: UploadedImage[] }) {
  const [images, setImages] = useState(defaultValue);
  const [uploading, setUploading] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = [...files].slice(0, MAX_IMAGES - images.length);
    setUploading((n) => n + selected.length);
    await Promise.all(
      selected.map(async (file) => {
        try {
          const blob = await upload(`productos/${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
            contentType: file.type,
          });
          setImages((prev) => [...prev, { url: blob.url, pathname: blob.pathname }]);
        } catch (err) {
          console.error(err);
          toast.error(`No se pudo subir ${file.name}`, {
            description: "Revisá que Vercel Blob esté configurado (BLOB_READ_WRITE_TOKEN).",
          });
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  function moveFirst(index: number) {
    setImages((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.pathname} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 text-[10px] font-medium">Portada</span>
            )}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {i > 0 && (
                <Button type="button" size="icon-xs" variant="secondary" onClick={() => moveFirst(i)} aria-label="Usar como portada">
                  <ArrowLeft />
                </Button>
              )}
              <Button
                type="button"
                size="icon-xs"
                variant="secondary"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Quitar foto"
              >
                <X />
              </Button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="flex aspect-square items-center justify-center rounded-lg border border-dashed">
            <Spinner />
          </div>
        ))}
        {images.length + uploading < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ImagePlus className="size-5" />
            Agregar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">Hasta {MAX_IMAGES} fotos. La primera es la portada en la tienda.</p>
    </div>
  );
}

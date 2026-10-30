// Fotos de productos subidas en masa: cada archivo se llama como el código de barras.
// Sin acceso a base de datos (testeable con Vitest); lo usan el script de subida y la importación.

/** Carpeta de Vercel Blob donde van las fotos (también las que se suben desde el panel). */
export const PHOTO_FOLDER = "productos/";
export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const PHOTO_NAME = /^(.+?)(?:_([2-8]))?\.(jpe?g|png|webp)$/i;

/** "01000602M.jpg" es la portada; "01000602M_2.jpg" … "_8" son las fotos siguientes. */
export function parsePhotoName(fileName: string): { code: string; position: number; ext: string } | null {
  const match = PHOTO_NAME.exec(fileName.split(/[\\/]/).pop() ?? "");
  if (!match) return null;
  return { code: match[1], position: match[2] ? Number(match[2]) - 1 : 0, ext: match[3].toLowerCase() };
}

/** Nombre con el que se guarda en Blob: siempre con el código tal como está en la base. */
export function photoPathname(barcode: string, position: number, ext: string) {
  return `${PHOTO_FOLDER}${barcode}${position > 0 ? `_${position + 1}` : ""}.${ext === "jpeg" ? "jpg" : ext}`;
}

export type MatchedPhoto<T> = T & { barcode: string; position: number; ext: string };

/**
 * Relaciona archivos con productos por código (sin distinguir mayúsculas).
 * Si hay dos archivos para la misma foto de un producto (ej. .jpg y .png), queda el primero.
 */
export function matchPhotos<T extends { name: string }>(files: T[], barcodes: string[]) {
  const byCode = new Map(barcodes.map((b) => [b.toLowerCase(), b]));
  const matched = new Map<string, MatchedPhoto<T>[]>();
  const unmatched: (T & { code: string })[] = [];
  const invalid: T[] = [];
  const duplicates: T[] = [];

  for (const file of files) {
    const parsed = parsePhotoName(file.name);
    if (!parsed) {
      invalid.push(file);
      continue;
    }
    const barcode = byCode.get(parsed.code.toLowerCase());
    if (!barcode) {
      unmatched.push({ ...file, code: parsed.code });
      continue;
    }
    const photos = matched.get(barcode) ?? [];
    if (photos.some((p) => p.position === parsed.position)) {
      duplicates.push(file);
      continue;
    }
    photos.push({ ...file, barcode, position: parsed.position, ext: parsed.ext });
    matched.set(barcode, photos.sort((a, b) => a.position - b.position));
  }
  return { matched, unmatched, invalid, duplicates };
}

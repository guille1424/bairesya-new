import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/dal";
import { MAX_PHOTO_BYTES, PHOTO_FOLDER, parsePhotoName, photoPathname } from "@/lib/domain/photos";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  // El pedido de token lo hace el navegador con la cookie de sesión; el aviso de
  // "subida completa" lo manda Vercel firmado, sin cookie, y lo valida handleUpload.
  if (body.type === "blob.generate-client-token" && !(await getStaff())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(PHOTO_FOLDER)) throw new Error("Ruta inválida");
        const limits = {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
          maximumSizeInBytes: MAX_PHOTO_BYTES,
        };
        // Subida masiva: el nombre es el código del producto y una foto nueva reemplaza a la anterior.
        if (clientPayload === "masiva") {
          const photo = parsePhotoName(pathname);
          if (!photo || photoPathname(photo.code, photo.position, photo.ext) !== pathname) {
            throw new Error("Nombre de foto inválido");
          }
          return { ...limits, addRandomSuffix: false, allowOverwrite: true };
        }
        return { ...limits, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la imagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

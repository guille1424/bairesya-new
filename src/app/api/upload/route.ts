import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth/dal";

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
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("productos/")) throw new Error("Ruta inválida");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir la imagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

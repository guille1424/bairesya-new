import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} · ${siteConfig.claim}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen para compartir en WhatsApp/redes: slogan de marca sobre fondo oscuro. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 15% 10%, #4c2fd1 0%, #0b0b10 55%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 4 }}>
          BAIRES<span style={{ color: "#c6f432" }}>YA</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 900, lineHeight: 0.95, textTransform: "uppercase" }}>
          <span>La ciudad no espera.</span>
          <span style={{ color: "#c6f432" }}>Vos tampoco.</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 30, color: "rgba(255,255,255,.7)" }}>
          <span>Deportivo</span>·<span>Urbano</span>·<span>Formal</span>
        </div>
      </div>
    ),
    size,
  );
}

const items = ["Moda mujer", "Deportivo", "Urbano", "Formal", "Nueva temporada", "Talles reales", "Pedí por WhatsApp", "Hecho en Buenos Aires"];

/** Franja animada de marca (se detiene si el usuario prefiere menos movimiento). */
export function Marquee() {
  const row = items.flatMap((item) => [item, "✦"]);
  return (
    <div className="overflow-hidden bg-brand-ink py-3 text-brand-surface" aria-label={items.join(", ")}>
      <div className="flex w-max animate-marquee gap-6 font-display text-xl tracking-wide uppercase motion-reduce:animate-none md:text-2xl" aria-hidden>
        {[...row, ...row].map((text, i) => (
          <span key={i} className={text === "✦" ? "opacity-50" : undefined}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

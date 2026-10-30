import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Banknote, MessageCircle, Ruler, Truck } from "lucide-react";
import { lines, lineValues } from "@/lib/lines";
import { cn } from "@/lib/utils";

/** Las tres colecciones de la marca, una por momento del día. */
export function Collections() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Colecciones</p>
          <h2 className="font-display text-5xl leading-none tracking-tight uppercase md:text-6xl">
            Una marca para
            <br />
            todo tu día.
          </h2>
        </div>
        <p className="max-w-sm text-muted-foreground">
          A la mañana entrenás, a la tarde la ciudad y a la noche salís. Armamos cada colección para ese momento, pensada para vos.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {lineValues.map((line, i) => {
          const l = lines[line];
          return (
            <Link
              key={line}
              href={`/coleccion/${l.slug}`}
              className="group relative flex min-h-[30rem] flex-col justify-between overflow-hidden rounded-3xl bg-brand-soft p-6 text-white"
            >
              <Image
                src={l.image}
                alt={`Colección ${l.label}`}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="relative z-10 flex items-start justify-between">
                <span className={cn("rounded-full px-2.5 py-1 font-mono text-xs font-medium tracking-widest uppercase", l.tone)}>
                  0{i + 1} — {l.moment}
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="font-display text-6xl leading-none tracking-tight uppercase">{l.label}</h3>
                <p className="mt-3 max-w-[18rem] text-sm text-white/80">{l.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const promises = [
  { icon: MessageCircle, title: "Atención directa", text: "Te respondemos por WhatsApp, sin bots." },
  { icon: Banknote, title: "Efectivo o transferencia", text: "Elegí cómo pagar cuando confirmamos tu pedido." },
  { icon: Truck, title: "Envío o retiro", text: "Coordinamos la entrega que te quede cómoda." },
  { icon: Ruler, title: "Talles reales", text: "¿Dudas con el talle? Te asesoramos por chat." },
];

export function Promises() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {promises.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

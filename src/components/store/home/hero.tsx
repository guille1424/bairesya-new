import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lines, lineValues } from "@/lib/lines";
import { siteConfig } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/** Portada: titular de marca + collage de las tres colecciones. Todo estático (entra en el static shell). */
export function Hero() {
  const wa = whatsappLink(siteConfig.whatsappNumber, "¡Hola BairesYa! Quiero hacer una consulta.");
  return (
    <section className="relative isolate overflow-hidden bg-cement text-brand-ink">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-8 lg:pt-20 lg:pb-16">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-ink/15 bg-brand-ink/5 px-3 py-1 text-xs font-medium tracking-wide text-brand-ink/80 uppercase">
            <span className="size-1.5 rounded-full bg-brand-accent" />
            Moda mujer · Primavera–Verano 26/27
          </p>
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.95] font-semibold uppercase [font-variation-settings:'opsz'_11]">
            La ciudad
            <br />
            no espera.
            <br />
            <span className="text-brand-accent italic">Vos tampoco.</span>
          </h1>
          <p className="max-w-lg text-base text-brand-ink/70 md:text-lg">
            Moda femenina deportiva, urbana y formal. Lo último en tendencias para moverte, trabajar y salir, lista para hoy.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6">
              <Link href="/#catalogo">
                Ver la colección <ArrowRight />
              </Link>
            </Button>
            {wa && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-brand-ink/25 bg-transparent px-6 text-brand-ink hover:bg-brand-ink/10 hover:text-brand-ink"
              >
                <a href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle /> Comprar por WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Collage de colecciones */}
        <div className="relative mx-auto grid w-full max-w-xl grid-cols-3 gap-3 sm:gap-4 lg:h-[560px] lg:max-w-none lg:grid-cols-6 lg:grid-rows-6">
          {lineValues.map((line, i) => {
            const l = lines[line];
            return (
              <Link
                key={line}
                href={`/?linea=${l.slug}#catalogo`}
                className={cn(
                  "group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl bg-brand-soft p-3 sm:p-4 lg:aspect-auto",
                  i === 0 && "lg:col-span-3 lg:row-span-4",
                  i === 1 && "lg:col-span-3 lg:col-start-4 lg:row-span-3 lg:row-start-2",
                  i === 2 && "lg:col-span-3 lg:col-start-1 lg:row-span-2 lg:row-start-5",
                )}
              >
                <Image
                  src={l.image}
                  alt={`Colección ${l.label}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 22vw, 30vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                <span className={cn("relative z-10 w-fit rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tracking-widest uppercase sm:text-xs", l.tone)}>
                  0{i + 1}
                  <span className="hidden sm:inline"> · {l.moment}</span>
                </span>
                <span className="relative z-10 flex items-end justify-between font-display text-xl tracking-wide text-white uppercase sm:text-3xl">
                  {l.label}
                  <ArrowRight className="hidden size-5 transition-transform group-hover:translate-x-1 sm:block" />
                </span>
              </Link>
            );
          })}
          {/* Sello de marca */}
          <div className="hidden items-center justify-center rounded-2xl border border-brand-ink/10 bg-brand-ink/[0.03] lg:col-span-3 lg:col-start-4 lg:row-span-2 lg:row-start-5 lg:flex">
            <p className="text-center font-display text-5xl leading-none tracking-wide uppercase">
              Baires<span className="text-brand-accent">Ya</span>
              <span className="mt-2 block font-sans text-xs font-normal tracking-[0.35em] text-brand-ink/70">Buenos Aires · Ahora</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

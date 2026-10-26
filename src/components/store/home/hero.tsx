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
    <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
      {/* Fondo: grilla sutil + luces de marca */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:64px_64px]"
      />
      <div aria-hidden className="absolute -top-40 -left-40 -z-10 size-[36rem] rounded-full bg-primary/45 blur-[120px]" />
      <div aria-hidden className="absolute -right-32 bottom-0 -z-10 size-[28rem] rounded-full bg-brand-lime/20 blur-[120px]" />

      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-8 lg:pt-20 lg:pb-16">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-white/80 uppercase">
            <span className="size-1.5 rounded-full bg-brand-lime" />
            Nueva temporada · Primavera–Verano 26/27
          </p>
          <h1 className="font-display text-[clamp(3.25rem,9.5vw,7.25rem)] leading-[0.95] tracking-tight uppercase">
            La ciudad
            <br />
            no espera.
            <br />
            <span className="text-brand-lime">Vos tampoco.</span>
          </h1>
          <p className="max-w-lg text-base text-white/70 md:text-lg">
            Deportivo, urbano y formal. Lo último de la moda para moverte, trabajar y salir, listo para hoy.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 bg-white px-6 text-zinc-950 hover:bg-white/90">
              <Link href="/#catalogo">
                Ver la colección <ArrowRight />
              </Link>
            </Button>
            {wa && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
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
                  "group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl p-3 sm:p-4 lg:aspect-auto",
                  l.tone,
                  i === 0 && "lg:col-span-3 lg:row-span-4",
                  i === 1 && "lg:col-span-3 lg:col-start-4 lg:row-span-3 lg:row-start-2",
                  i === 2 && "lg:col-span-3 lg:col-start-1 lg:row-span-2 lg:row-start-5 lg:flex-row lg:items-end",
                )}
              >
                <span className="relative z-10 font-mono text-[10px] tracking-widest uppercase opacity-70 sm:text-xs lg:self-start">
                  0{i + 1}
                  <span className="hidden sm:inline"> · {l.moment}</span>
                </span>
                <Image
                  src={l.image}
                  alt=""
                  width={900}
                  height={1200}
                  priority
                  sizes="(min-width: 1024px) 22vw, 30vw"
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-[16%] mx-auto h-[66%] w-auto object-contain transition-transform duration-500 group-hover:scale-105",
                    i === 2 && "lg:inset-x-auto lg:right-4 lg:bottom-[6%] lg:h-[88%]",
                  )}
                />
                <span className="relative z-10 flex items-end justify-between font-display text-xl tracking-wide uppercase sm:text-3xl">
                  {l.label}
                  <ArrowRight className="hidden size-5 transition-transform group-hover:translate-x-1 sm:block" />
                </span>
              </Link>
            );
          })}
          {/* Sello de marca */}
          <div className="hidden items-center justify-center rounded-2xl border border-white/10 lg:col-span-3 lg:col-start-4 lg:row-span-2 lg:row-start-5 lg:flex">
            <p className="text-center font-display text-5xl leading-none tracking-wide uppercase">
              Baires<span className="text-brand-lime">Ya</span>
              <span className="mt-2 block font-sans text-xs font-normal tracking-[0.35em] text-white/50">Buenos Aires · Ahora</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

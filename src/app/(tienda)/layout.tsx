import { Suspense } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand";
import { CartProvider } from "@/components/store/cart";
import { CartSheet } from "@/components/store/cart-sheet";
import { AccountLink, StoreHeader } from "@/components/store/store-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomer } from "@/lib/auth/dal";
import { lines, lineValues } from "@/lib/lines";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";

async function Account() {
  const customer = await getCustomer();
  const phone = customer
    ? (await prisma.customer.findUnique({ where: { id: customer.id }, select: { phone: true } }))?.phone ?? null
    : null;
  return <AccountLink customer={customer ? { name: customer.name, phone } : null} />;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const wa = whatsappLink(siteConfig.whatsappNumber, "¡Hola BairesYa! Tengo una consulta.");
  return (
    <CartProvider>
      <StoreHeader
        account={
          <Suspense fallback={<Skeleton className="h-8 w-20" />}>
            <Account />
          </Suspense>
        }
      />
      <main className="flex-1">{children}</main>
      <footer className="bg-cement text-brand-ink">
        <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
          <p className="font-serif text-[clamp(2rem,5.5vw,5rem)] leading-[0.95] font-semibold uppercase [font-variation-settings:'opsz'_11]">
            La ciudad no espera.
            <br />
            <span className="text-brand-accent italic">Vos tampoco.</span>
          </p>
          <div className="mt-12 grid gap-8 border-t border-brand-ink/10 py-10 sm:grid-cols-4">
            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center gap-3">
                <Logo className="w-12" />
                <span className="font-display text-2xl tracking-wide uppercase">
                  Baires<span className="text-brand-accent">Ya</span>
                </span>
              </div>
              <p className="max-w-sm text-sm text-brand-ink/60">{siteConfig.description}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Colecciones</p>
              {lineValues.map((l) => (
                <Link key={l} href={`/?linea=${lines[l].slug}#catalogo`} className="block text-brand-ink/60 hover:text-brand-ink">
                  {lines[l].label}
                </Link>
              ))}
              <Link href="/mi-cuenta" className="block text-brand-ink/60 hover:text-brand-ink">
                Mi cuenta
              </Link>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Contacto</p>
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-ink/60 hover:text-brand-ink">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
              <p className="text-brand-ink/60">Buenos Aires, Argentina</p>
            </div>
          </div>
        </div>
        <div className="border-t border-brand-ink/10 py-5 text-center text-xs text-brand-ink/50">
          © {siteConfig.name} · {siteConfig.tagline}
        </div>
      </footer>
      <CartSheet />
    </CartProvider>
  );
}

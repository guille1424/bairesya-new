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
      <footer className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
          <p className="font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.9] tracking-tight uppercase">
            La ciudad no espera.
            <br />
            <span className="text-brand-lime">Vos tampoco.</span>
          </p>
          <div className="mt-12 grid gap-8 border-t border-white/10 py-10 sm:grid-cols-4">
            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center gap-3">
                <Logo className="w-12 invert dark:invert" />
                <span className="font-display text-2xl tracking-wide uppercase">
                  Baires<span className="text-brand-lime">Ya</span>
                </span>
              </div>
              <p className="max-w-sm text-sm text-white/60">{siteConfig.description}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Colecciones</p>
              {lineValues.map((l) => (
                <Link key={l} href={`/?linea=${lines[l].slug}#catalogo`} className="block text-white/60 hover:text-white">
                  {lines[l].label}
                </Link>
              ))}
              <Link href="/mi-cuenta" className="block text-white/60 hover:text-white">
                Mi cuenta
              </Link>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Contacto</p>
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white/60 hover:text-white">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
              <p className="text-white/60">Buenos Aires, Argentina</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
          © {siteConfig.name} · {siteConfig.tagline}
        </div>
      </footer>
      <CartSheet />
    </CartProvider>
  );
}

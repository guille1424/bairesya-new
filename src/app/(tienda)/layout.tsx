import { Suspense } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand";
import { CartProvider } from "@/components/store/cart";
import { CartSheet } from "@/components/store/cart-sheet";
import { AccountLink, StoreHeader } from "@/components/store/store-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomer } from "@/lib/auth/dal";
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
      <footer className="mt-16 border-t">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div className="space-y-3">
            <Logo className="w-16" />
            <p className="text-sm text-muted-foreground">{siteConfig.description}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Tienda</p>
            <Link href="/" className="block text-muted-foreground hover:text-foreground">
              Colección
            </Link>
            <Link href="/mi-cuenta" className="block text-muted-foreground hover:text-foreground">
              Mi cuenta
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Contacto</p>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {siteConfig.name}. Todos los derechos reservados.
        </div>
      </footer>
      <CartSheet />
    </CartProvider>
  );
}

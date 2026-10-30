import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { siteConfig } from "@/lib/site";

/** Camino hasta la página: visible y para Google, que lo muestra en el resultado en lugar de la dirección. */
export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  const trail = [{ name: "Inicio", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: new URL(item.href, siteConfig.url).href,
    })),
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Ubicación" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          {trail.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight aria-hidden className="size-3.5" />}
              {i === trail.length - 1 ? (
                <span aria-current="page" className="text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

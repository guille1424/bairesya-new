// Listado de productos para Google Merchant Center (aparecer gratis en Google Shopping).
// Se carga en Merchant Center como "feed programado" con la dirección https://www.bairesya.com/feed/google.xml
import { connection } from "next/server";
import { getFeedProducts, type FeedProduct } from "@/lib/data/catalog";
import { productPath, productTitle, slugify } from "@/lib/domain/seo";
import { lines } from "@/lib/lines";
import { absoluteUrl, siteConfig } from "@/lib/site";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function item(p: FeedProduct) {
  const line = p.line ? lines[p.line].label : null;
  const description =
    p.description ||
    `${productTitle(p)} de ${siteConfig.name}${line ? `, colección ${line}` : ""}. Ropa de mujer en Buenos Aires.`;
  const fields: [string, string | null][] = [
    ["g:id", p.barcode],
    ["title", [productTitle(p), p.size && `talle ${p.size}`].filter(Boolean).join(" ").slice(0, 150)],
    ["description", description.slice(0, 5000)],
    ["link", `${siteConfig.url}${productPath(p)}`],
    ["g:image_link", absoluteUrl(p.images[0])],
    ...p.images.slice(1, 11).map((url): [string, string] => ["g:additional_image_link", absoluteUrl(url)]),
    // "Por encargo" va como sin stock: backorder exige informar una fecha de llegada.
    ["g:availability", p.available > 0 ? "in_stock" : "out_of_stock"],
    ["g:price", `${p.price.toFixed(2)} ARS`],
    ["g:brand", siteConfig.name],
    ["g:condition", "new"],
    // Los códigos son internos, no GTIN de fábrica.
    ["g:identifier_exists", "no"],
    ["g:item_group_id", slugify(p.name)],
    ["g:google_product_category", "1604"], // Indumentaria y accesorios > Ropa
    ["g:product_type", [line, p.category].filter(Boolean).join(" > ") || null],
    ["g:gender", "female"],
    ["g:age_group", "adult"],
    ["g:color", p.color],
    ["g:size", p.size],
  ];
  const body = fields
    .filter((f): f is [string, string] => Boolean(f[1]))
    .map(([tag, value]) => `      <${tag}>${escape(value)}</${tag}>`)
    .join("\n");
  return `    <item>\n${body}\n    </item>`;
}

export async function GET() {
  await connection();
  // Google rechaza productos sin foto o sin precio.
  const products = (await getFeedProducts()).filter((p) => p.images.length > 0 && p.price > 0);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escape(siteConfig.name)}</title>
    <link>${escape(siteConfig.url)}</link>
    <description>${escape(siteConfig.description)}</description>
${products.map(item).join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" },
  });
}

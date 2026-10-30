import { describe, expect, it } from "vitest";
import { canonicalVariants, displayCategory, findCategoryBySlug, productPath, productSlug, productTitle, slugify } from "./seo";

describe("slugify", () => {
  it("quita tildes, eñes y símbolos", () => {
    expect(slugify("Calza Térmica 3/4")).toBe("calza-termica-3-4");
    expect(slugify("  Buzo Niño (frisa)  ")).toBe("buzo-nino-frisa");
  });
});

describe("productPath", () => {
  it("suma el nombre y el color al código", () => {
    expect(productPath({ barcode: "01000302M", name: "Calza Mia", color: "Negro" })).toBe("/producto/01000302M/calza-mia-negro");
  });

  it("no repite el color si ya está en el nombre", () => {
    expect(productSlug({ name: "Remera Negro Total", color: "NEGRO" })).toBe("remera-negro-total");
    expect(productTitle({ name: "Remera Negro Total", color: "NEGRO" })).toBe("Remera Negro Total");
    expect(productTitle({ name: "Calza Mia", color: "Negro" })).toBe("Calza Mia Negro");
  });

  it("codifica el código y omite la parte legible si queda vacía", () => {
    expect(productPath({ barcode: "A B/1", name: "***", color: null })).toBe("/producto/A%20B%2F1");
  });
});

describe("canonicalVariants", () => {
  it("elige una variante por modelo y color, la de menor código", () => {
    const main = canonicalVariants([
      { barcode: "B-M", name: "Calza Mia", color: "Negro" },
      { barcode: "B-S", name: "calza mia ", color: "negro" },
      { barcode: "C-S", name: "Calza Mia", color: "Gris" },
      { barcode: "A-U", name: "Top", color: null },
    ]);
    expect(main.map((p) => p.barcode)).toEqual(["B-M", "C-S", "A-U"]);
  });
});

describe("categorías", () => {
  it("muestra las cargadas en mayúsculas con formato de título", () => {
    expect(displayCategory("CALZAS")).toBe("Calzas");
    expect(displayCategory("Remeras oversize")).toBe("Remeras oversize");
  });

  it("encuentra la categoría por su dirección", () => {
    expect(findCategoryBySlug(["Calzas", "Camperas y Abrigos"], "camperas-y-abrigos")).toBe("Camperas y Abrigos");
    expect(findCategoryBySlug(["Calzas"], "buzos")).toBeUndefined();
  });
});

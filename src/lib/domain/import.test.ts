import { describe, expect, it } from "vitest";
import { fillModelFields, parseYesNo } from "./import";

describe("fillModelFields", () => {
  it("copia la descripción y la publicación a las demás variantes del modelo", () => {
    const rows = fillModelFields([
      { name: "Remera Oversize", size: "S", publicDescription: "Algodón peinado", isPublic: true },
      { name: "remera oversize ", size: "M" },
      { name: "Jean Mom", size: "38" },
    ]);
    expect(rows[1]).toMatchObject({ size: "M", publicDescription: "Algodón peinado", isPublic: true });
    expect(rows[2]).toMatchObject({ publicDescription: undefined, isPublic: undefined });
  });

  it("toma la primera fila que tenga el dato, aunque no sea la primera del modelo", () => {
    const rows = fillModelFields([
      { name: "Buzo", isPublic: false },
      { name: "Buzo", publicDescription: "Frisa", isPublic: true },
      { name: "Buzo" },
    ]);
    expect(rows.map((r) => r.publicDescription)).toEqual(["Frisa", "Frisa", "Frisa"]);
    expect(rows.map((r) => r.isPublic)).toEqual([false, true, false]);
  });
});

describe("parseYesNo", () => {
  it("entiende sí y no escritos de distintas formas", () => {
    expect(["Sí", "si", "X", true, "VERDADERO"].map(parseYesNo)).toEqual([true, true, true, true, true]);
    expect(["No", "n", false, 0].map(parseYesNo)).toEqual([false, false, false, false]);
  });

  it("vacío es sin dato e inválido es null", () => {
    expect(parseYesNo("")).toBeUndefined();
    expect(parseYesNo(null)).toBeUndefined();
    expect(parseYesNo("tal vez")).toBeNull();
  });
});

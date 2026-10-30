import { describe, expect, it } from "vitest";
import { matchPhotos, parsePhotoName, photoPathname } from "./photos";

describe("parsePhotoName", () => {
  it("el código es la portada y _2 … _8 las fotos siguientes", () => {
    expect(parsePhotoName("01000602M.jpg")).toEqual({ code: "01000602M", position: 0, ext: "jpg" });
    expect(parsePhotoName("01000602M_3.JPEG")).toEqual({ code: "01000602M", position: 2, ext: "jpeg" });
    expect(parsePhotoName("fotos/99000807UNICO.png")).toEqual({ code: "99000807UNICO", position: 0, ext: "png" });
  });

  it("respeta los códigos con guiones y no confunde _9 con una foto extra", () => {
    expect(parsePhotoName("E2E-5E2H-IMP-2.jpg")).toMatchObject({ code: "E2E-5E2H-IMP-2", position: 0 });
    expect(parsePhotoName("ABC_9.jpg")).toMatchObject({ code: "ABC_9", position: 0 });
  });

  it("ignora lo que no es foto", () => {
    expect(parsePhotoName("lista.xlsx")).toBeNull();
    expect(parsePhotoName(".jpg")).toBeNull();
  });
});

describe("photoPathname", () => {
  it("arma la ruta en la carpeta de productos", () => {
    expect(photoPathname("01000602M", 0, "jpeg")).toBe("productos/01000602M.jpg");
    expect(photoPathname("01000602M", 1, "png")).toBe("productos/01000602M_2.png");
  });
});

describe("matchPhotos", () => {
  it("agrupa por producto, ordena y separa lo que no corresponde", () => {
    const files = ["01000602m_2.jpg", "01000602M.jpg", "01000602M.png", "0300010138.jpg", "nota.txt"].map((name) => ({ name }));
    const { matched, unmatched, invalid, duplicates } = matchPhotos(files, ["01000602M", "01000602L"]);
    expect(matched.get("01000602M")?.map((p) => [p.name, p.position])).toEqual([
      ["01000602M.jpg", 0],
      ["01000602m_2.jpg", 1],
    ]);
    expect(unmatched).toEqual([{ name: "0300010138.jpg", code: "0300010138" }]);
    expect(invalid).toEqual([{ name: "nota.txt" }]);
    expect(duplicates).toEqual([{ name: "01000602M.png" }]);
  });
});

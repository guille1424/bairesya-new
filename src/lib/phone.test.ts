import { describe, expect, it } from "vitest";
import { normalizeArPhone } from "./phone";
import { whatsappLink } from "./whatsapp";

describe("normalizeArPhone", () => {
  it("agrega 549 a números de 10 dígitos", () => {
    expect(normalizeArPhone("11 2345-6789")).toBe("5491123456789");
  });
  it("convierte el prefijo 15", () => {
    expect(normalizeArPhone("15 1234 56789")).toBe("549123456789");
  });
  it("respeta números ya internacionales", () => {
    expect(normalizeArPhone("+54 9 11 2345 6789")).toBe("5491123456789");
  });
});

describe("whatsappLink", () => {
  it("arma el link con texto codificado", () => {
    expect(whatsappLink("5491123456789", "Hola ¿todo bien?")).toBe(
      "https://wa.me/5491123456789?text=Hola%20%C2%BFtodo%20bien%3F",
    );
  });
  it("devuelve null sin teléfono", () => {
    expect(whatsappLink("")).toBeNull();
  });
});

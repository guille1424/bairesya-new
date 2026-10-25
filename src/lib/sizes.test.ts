import { describe, expect, it } from "vitest";
import { compareSizes } from "./sizes";

describe("compareSizes", () => {
  it("ordena letras, números y talle único", () => {
    expect(["L", "Único", "XL", "38", "S", "M", "36", "42"].sort(compareSizes)).toEqual([
      "S",
      "M",
      "L",
      "XL",
      "36",
      "38",
      "42",
      "Único",
    ]);
  });
});

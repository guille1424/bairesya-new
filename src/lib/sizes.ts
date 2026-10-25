const ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Ordena talles como se leen en una etiqueta: XS, S, M, L…, números de menor a mayor y "Único" al final. */
export function compareSizes(a: string | null, b: string | null) {
  const rank = (s: string | null) => {
    if (!s) return [3, 0, ""] as const;
    const upper = s.trim().toUpperCase();
    const letter = ORDER.indexOf(upper);
    if (letter >= 0) return [0, letter, ""] as const;
    const n = Number(upper.replace(",", "."));
    if (Number.isFinite(n)) return [1, n, ""] as const;
    return [2, 0, upper] as const;
  };
  const [ga, na, ta] = rank(a);
  const [gb, nb, tb] = rank(b);
  return ga - gb || na - nb || ta.localeCompare(tb);
}

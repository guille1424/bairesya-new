// Reglas de la importación desde Excel, sin acceso a base de datos (testeables con Vitest).

/** La tienda agrupa como un mismo modelo las variantes con el mismo nombre. */
export function modelKey(name: string) {
  return name.trim().toLowerCase();
}

export type ModelFields = {
  name: string;
  publicDescription?: string;
  isPublic?: boolean;
};

/**
 * La descripción y la publicación en la tienda se escriben una vez por modelo: las filas del mismo
 * modelo que las dejan vacías toman las de la primera fila del archivo que las tenga.
 */
export function fillModelFields<T extends ModelFields>(rows: T[]): T[] {
  const models = new Map<string, Pick<ModelFields, "publicDescription" | "isPublic">>();
  for (const row of rows) {
    const model = models.get(modelKey(row.name)) ?? {};
    model.publicDescription ??= row.publicDescription;
    model.isPublic ??= row.isPublic;
    models.set(modelKey(row.name), model);
  }
  return rows.map((row) => {
    const model = models.get(modelKey(row.name))!;
    return {
      ...row,
      publicDescription: row.publicDescription ?? model.publicDescription,
      isPublic: row.isPublic ?? model.isPublic,
    };
  });
}

/** Acepta "Sí", "si", "No", "x", VERDADERO… Vacío = sin dato. */
export function parseYesNo(value: unknown): boolean | null | undefined {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return undefined;
  if (["sí", "si", "s", "x", "yes", "true", "verdadero", "1"].includes(text)) return true;
  if (["no", "n", "false", "falso", "0"].includes(text)) return false;
  return null;
}

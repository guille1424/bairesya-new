export type SearchParams = Record<string, string | string[] | undefined>;

export function param(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

export function pageParam(params: SearchParams) {
  const n = Number(param(params, "page"));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function oneOf<T extends string>(value: string | undefined, options: readonly T[]): T | undefined {
  return options.includes(value as T) ? (value as T) : undefined;
}

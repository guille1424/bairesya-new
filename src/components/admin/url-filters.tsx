"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const ALL = "__all__";

/** Actualiza parámetros de la URL (y vuelve a la página 1). */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in updates)) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, set, pending };
}

export function SearchFilter({ placeholder = "Buscar…", paramKey = "q" }: { placeholder?: string; paramKey?: string }) {
  const { params, set, pending } = useUrlParams();
  const current = params.get(paramKey) ?? "";
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (value === current) return;
    const timer = setTimeout(() => set({ [paramKey]: value || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <InputGroup className="w-full sm:max-w-xs">
      <InputGroupAddon>{pending ? <Spinner /> : <Search />}</InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </InputGroup>
  );
}

export function SelectFilter({
  paramKey,
  placeholder,
  options,
  className,
}: {
  paramKey: string;
  placeholder: string;
  options: { value: string; label: string }[] | string[];
  className?: string;
}) {
  const { params, set } = useUrlParams();
  const normalized = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select value={params.get(paramKey) ?? ALL} onValueChange={(v) => set({ [paramKey]: v === ALL ? undefined : v })}>
      <SelectTrigger className={className ?? "w-full sm:w-40"} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {normalized.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ClearFilters({ keys }: { keys: string[] }) {
  const { params, set } = useUrlParams();
  if (!keys.some((k) => params.get(k))) return null;
  return (
    <Button variant="ghost" size="sm" onClick={() => set(Object.fromEntries(keys.map((k) => [k, undefined])))}>
      <X /> Limpiar
    </Button>
  );
}

export function Pagination({
  page,
  pages,
  total,
  noun,
}: {
  page: number;
  pages: number;
  total: number;
  /** [singular, plural] */
  noun: [string, string];
}) {
  const { set, pending } = useUrlParams();
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {total} {total === 1 ? noun[0] : noun[1]}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Página {page} de {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page <= 1 || pending} onClick={() => set({ page: String(page - 1) })}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages || pending} onClick={() => set({ page: String(page + 1) })}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

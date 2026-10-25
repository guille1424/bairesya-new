"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado guardado en localStorage, compatible con SSR (el servidor ve el valor inicial)
 * y sincronizado entre pestañas.
 */
export function createPersistentStore<T>(key: string, fallback: T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (cache === undefined) {
      try {
        const raw = localStorage.getItem(key);
        cache = raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        cache = fallback;
      }
    }
    return cache;
  }

  function set(update: T | ((prev: T) => T)) {
    cache = typeof update === "function" ? (update as (prev: T) => T)(read()) : update;
    try {
      localStorage.setItem(key, JSON.stringify(cache));
    } catch {}
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      cache = undefined;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue() {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { useValue, set };
}

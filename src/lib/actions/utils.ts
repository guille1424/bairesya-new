import "server-only";
import { z } from "zod";
import { AuthError } from "@/lib/auth/dal";
import { OrderError } from "@/lib/domain/orders";
import type { ActionState } from "./types";

/** Errores esperables que se muestran al usuario; el resto se loguea y se muestra genérico. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof AuthError || err instanceof OrderError || err instanceof UserError) {
    return { error: err.message };
  }
  if (isRedirectLike(err)) throw err;
  console.error(err);
  return { error: "Ocurrió un error inesperado. Probá de nuevo." };
}

export class UserError extends Error {}

export function fieldErrors(error: z.ZodError): ActionState {
  return { fieldErrors: z.flattenError(error).fieldErrors as ActionState["fieldErrors"] };
}

function isRedirectLike(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_");
}

// Firma y verificación de tokens de sesión. Sin dependencias de Next para poder usarse en proxy.ts.
import { SignJWT, jwtVerify } from "jose";

export const STAFF_COOKIE = "by_staff";
export const CUSTOMER_COOKIE = "by_customer";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type StaffSession = {
  kind: "staff";
  userId: string;
  username: string;
  role: "ADMIN" | "EMPLOYEE";
};

export type CustomerSession = {
  kind: "customer";
  customerId: string;
  name: string;
};

type Session = StaffSession | CustomerSession;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET no está definido o es demasiado corto (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession<K extends Session["kind"]>(
  token: string | undefined,
  kind: K,
): Promise<Extract<Session, { kind: K }> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.kind === kind ? (payload as Extract<Session, { kind: K }>) : null;
  } catch {
    return null;
  }
}

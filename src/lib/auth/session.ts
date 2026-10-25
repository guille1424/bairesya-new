import "server-only";
import { cookies } from "next/headers";
import {
  CUSTOMER_COOKIE,
  SESSION_TTL_SECONDS,
  STAFF_COOKIE,
  signSession,
  verifySession,
  type CustomerSession,
  type StaffSession,
} from "./token";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export async function setStaffSession(session: Omit<StaffSession, "kind">) {
  const token = await signSession({ kind: "staff", ...session });
  (await cookies()).set(STAFF_COOKIE, token, cookieOptions);
}

export async function setCustomerSession(session: Omit<CustomerSession, "kind">) {
  const token = await signSession({ kind: "customer", ...session });
  (await cookies()).set(CUSTOMER_COOKIE, token, cookieOptions);
}

export async function clearStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function clearCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function readStaffSession() {
  return verifySession((await cookies()).get(STAFF_COOKIE)?.value, "staff");
}

export async function readCustomerSession() {
  return verifySession((await cookies()).get(CUSTOMER_COOKIE)?.value, "customer");
}

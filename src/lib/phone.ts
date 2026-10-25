/**
 * Normaliza teléfonos argentinos al formato internacional de WhatsApp (549 + área + número).
 * Misma lógica que usaba la app anterior: 10 dígitos → 549…, "15…" → 549…, "9…" → 54….
 */
export function normalizeArPhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `549${digits}`;
  else if (digits.length === 11 && digits.startsWith("15")) digits = `549${digits.slice(2)}`;
  else if (digits.length === 11 && digits.startsWith("9")) digits = `54${digits}`;
  return digits;
}

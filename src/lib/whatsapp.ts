/** Arma un link de WhatsApp. Acepta números con espacios, guiones o "+". */
export function whatsappLink(phone: string | null | undefined, text?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

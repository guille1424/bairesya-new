import { z } from "zod";

export const staffLoginSchema = z.object({
  username: z.string().trim().min(1, "Ingresá tu usuario"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const customerLoginSchema = z.object({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.email("Email inválido").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

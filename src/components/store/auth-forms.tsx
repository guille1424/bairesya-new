"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormError, SubmitButton, TextField, useActionForm } from "@/components/form";
import { FieldGroup } from "@/components/ui/field";
import { customerLogin, customerRegister } from "@/lib/actions/auth";

function NextInput() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

export function CustomerLoginForm() {
  const { state, pending, onSubmit } = useActionForm(customerLogin);
  return (
    <form onSubmit={onSubmit}>
      <NextInput />
      <FieldGroup className="gap-4">
        <FormError state={state} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required autoFocus state={state} />
        <TextField label="Contraseña" name="password" type="password" autoComplete="current-password" required state={state} />
        <SubmitButton size="lg" className="w-full" pending={pending} pendingText="Ingresando…">
          Ingresar
        </SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
            Creala gratis
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}

export function CustomerRegisterForm() {
  const { state, pending, onSubmit } = useActionForm(customerRegister);
  return (
    <form onSubmit={onSubmit}>
      <NextInput />
      <FieldGroup className="gap-4">
        <FormError state={state} />
        <TextField label="Nombre y apellido" name="name" autoComplete="name" required autoFocus state={state} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required state={state} />
        <TextField label="WhatsApp" name="phone" type="tel" autoComplete="tel" placeholder="11 2345 6789" state={state} />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          description="Mínimo 8 caracteres."
          state={state}
        />
        <SubmitButton size="lg" className="w-full" pending={pending} pendingText="Creando cuenta…">
          Crear cuenta
        </SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/ingresar" className="font-medium text-primary underline-offset-4 hover:underline">
            Ingresá
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}

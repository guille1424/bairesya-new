"use client";

import { FormError, SubmitButton, TextField, useActionForm } from "@/components/form";
import { FieldGroup } from "@/components/ui/field";
import { staffLogin } from "@/lib/actions/auth";

export function StaffLoginForm() {
  const { state, pending, onSubmit } = useActionForm(staffLogin);

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <FormError state={state} />
        <TextField label="Usuario" name="username" autoComplete="username" autoFocus required state={state} />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          state={state}
        />
        <SubmitButton size="lg" className="w-full" pending={pending} pendingText="Ingresando…">
          Ingresar
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}

"use client";

import { FormError, SubmitButton, TextField, useActionForm, useOnActionSuccess } from "@/components/form";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { saveCustomer, type SavedCustomer } from "@/lib/actions/customers";
import type { CustomerRow } from "@/lib/data/customers";

export function CustomerForm({
  customer,
  onDone,
  onSaved,
}: {
  customer?: Pick<CustomerRow, "id" | "name" | "phone" | "email" | "address">;
  onDone: () => void;
  onSaved?: (customer: SavedCustomer) => void;
}) {
  const { state, pending, onSubmit } = useActionForm(saveCustomer);

  useOnActionSuccess(state, (s) => {
    if (s.customer) onSaved?.(s.customer);
    onDone();
  });

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="id" value={customer?.id ?? ""} />
      <FieldGroup className="gap-4">
        <FormError state={state} />
        <TextField label="Nombre" name="name" defaultValue={customer?.name} required autoFocus state={state} />
        <TextField
          label="Teléfono / WhatsApp"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="54 9 11 1234 5678"
          defaultValue={customer?.phone ?? ""}
          description="Con código de país y área, para poder escribirle por WhatsApp."
          state={state}
        />
        <TextField label="Email" name="email" type="email" defaultValue={customer?.email ?? ""} state={state} />
        <TextField label="Dirección" name="address" defaultValue={customer?.address ?? ""} state={state} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <SubmitButton pending={pending} pendingText="Guardando…">
            {customer ? "Guardar" : "Crear cliente"}
          </SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}

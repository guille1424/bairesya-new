"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { initialActionState, type ActionState } from "@/lib/actions/types";

/**
 * Envía el formulario a una Server Action sin el reseteo automático de React 19,
 * para no perder lo que el usuario escribió cuando hay errores de validación.
 */
export function useActionForm<S extends ActionState>(action: (prev: S, formData: FormData) => Promise<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(
    action as (prev: Awaited<S>, formData: FormData) => Promise<S>,
    initialActionState as Awaited<S>,
  );
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }
  return { state, pending, onSubmit };
}

/** Ejecuta `onSuccess` (y muestra el mensaje) una sola vez por cada resultado exitoso de la acción. */
export function useOnActionSuccess<S extends ActionState>(state: S, onSuccess: (state: S) => void) {
  const handled = useRef<S | null>(null);
  const callback = useRef(onSuccess);
  useEffect(() => {
    callback.current = onSuccess;
  });
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    if (state.message) toast.success(state.message);
    callback.current(state);
  }, [state]);
}

type TextFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  description?: string;
  state?: ActionState;
};

export function TextField({ label, name, description, state, id, ...props }: TextFieldProps) {
  const errors = state?.fieldErrors?.[name];
  const inputId = id ?? name;
  return (
    <Field data-invalid={errors ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input id={inputId} name={name} aria-invalid={errors ? true : undefined} {...props} />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}

export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export function FormError({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {state.error}
    </p>
  );
}

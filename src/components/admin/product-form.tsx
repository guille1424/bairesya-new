"use client";

import { useRef, useTransition } from "react";
import { Wand2 } from "lucide-react";
import { FormError, SubmitButton, TextField, useActionForm, useOnActionSuccess } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator, FieldSet, FieldLegend } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveProduct, suggestBarcode } from "@/lib/actions/products";
import type { ProductRow } from "@/lib/data/products";
import { ImageUploader } from "./image-uploader";

export type FilterOptions = { categories: string[]; colors: string[]; sizes: string[] };

export function ProductForm({
  product,
  options,
  canSeeCost,
  onDone,
}: {
  product?: ProductRow;
  options: FilterOptions;
  canSeeCost: boolean;
  onDone: () => void;
}) {
  const { state, pending, onSubmit } = useActionForm(saveProduct);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [generating, startGenerating] = useTransition();

  useOnActionSuccess(state, onDone);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <datalist id="dl-categories">{options.categories.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-colors">{options.colors.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="dl-sizes">{options.sizes.map((v) => <option key={v} value={v} />)}</datalist>

      <FormError state={state} />

      <FieldSet>
        <FieldLegend>Datos de la prenda</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                ref={barcodeRef}
                label="Código de barras"
                name="barcode"
                defaultValue={product?.barcode}
                required
                autoFocus={!product}
                state={state}
                className="font-mono"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={generating}
              onClick={() =>
                startGenerating(async () => {
                  const code = await suggestBarcode();
                  if (barcodeRef.current) barcodeRef.current.value = code;
                })
              }
            >
              <Wand2 /> Generar
            </Button>
          </div>
          <TextField label="Nombre" name="name" defaultValue={product?.name} required state={state} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Categoría" name="category" list="dl-categories" defaultValue={product?.category ?? ""} state={state} />
            <TextField label="Tipo" name="type" defaultValue={product?.type ?? ""} state={state} />
            <TextField label="Talle" name="size" list="dl-sizes" defaultValue={product?.size ?? ""} state={state} />
            <TextField label="Color" name="color" list="dl-colors" defaultValue={product?.color ?? ""} state={state} />
          </div>
          <TextField label="Diseño" name="design" defaultValue={product?.design ?? ""} state={state} />
        </FieldGroup>
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Precios y stock</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="grid grid-cols-2 gap-4">
            {canSeeCost && (
              <TextField label="Costo" name="cost" type="number" step="0.01" min="0" defaultValue={product?.cost ?? 0} state={state} />
            )}
            <TextField label="Stock" name="stock" type="number" step="1" min="0" defaultValue={product?.stock ?? 0} state={state} />
            <TextField label="Precio efectivo" name="priceNormal" type="number" step="0.01" min="0" defaultValue={product?.priceNormal ?? 0} state={state} />
            <TextField label="Precio transferencia" name="priceTransfer" type="number" step="0.01" min="0" defaultValue={product?.priceTransfer ?? 0} state={state} />
          </div>
          {!canSeeCost && <input type="hidden" name="cost" value="0" />}
        </FieldGroup>
      </FieldSet>

      {canSeeCost && (
        <>
          <FieldSeparator />
          <FieldSet>
            <FieldLegend>Proveedor</FieldLegend>
            <FieldGroup className="gap-4">
              <TextField label="Nombre del proveedor" name="supplierName" defaultValue={product?.supplierName ?? ""} state={state} />
              <TextField label="Dirección" name="supplierAddress" defaultValue={product?.supplierAddress ?? ""} state={state} />
            </FieldGroup>
          </FieldSet>
        </>
      )}

      <FieldSeparator />

      <FieldSet>
        <FieldLegend>Tienda online</FieldLegend>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <Switch id="isPublic" name="isPublic" defaultChecked={product?.isPublic ?? false} />
            <FieldLabel htmlFor="isPublic" className="font-normal">
              Mostrar en la tienda
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel htmlFor="publicDescription">Descripción para la tienda</FieldLabel>
            <Textarea id="publicDescription" name="publicDescription" rows={3} defaultValue={product?.publicDescription ?? ""} />
            <FieldDescription>Material, calce, cuidados… Se muestra en la ficha del producto.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Fotos</FieldLabel>
            <ImageUploader name="images" defaultValue={product?.images ?? []} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t bg-background px-6 py-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton pending={pending} pendingText="Guardando…">{product ? "Guardar cambios" : "Crear producto"}</SubmitButton>
      </div>
    </form>
  );
}

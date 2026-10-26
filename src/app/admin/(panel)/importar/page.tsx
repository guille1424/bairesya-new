import type { Metadata } from "next";
import { Download } from "lucide-react";
import { ImportWizard } from "@/components/admin/import-wizard";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Importar Excel" };

const columns = [
  ["barcode", "Código de barras único", true],
  ["name", "Nombre del producto", true],
  ["category", "Categoría (ej: Remera, Pantalón)", false],
  ["line", "Colección: Deportivo, Urbano o Formal", false],
  ["size", "Talle (ej: S, M, L, 32)", false],
  ["color", "Color", false],
  ["type / design", "Tipo y diseño", false],
  ["price", "Precio de costo", false],
  ["priceNormal", "Precio de venta en efectivo", false],
  ["priceTransfer", "Precio de venta por transferencia", false],
  ["stock", "Cantidad en stock (reemplaza la actual)", false],
  ["supplierName", "Proveedor", false],
  ["supplierAddress", "Dirección del proveedor", false],
] as const;

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Importar Excel"
        description="Cargá o actualizá muchas prendas de una vez. Vas a ver una vista previa antes de confirmar."
        actions={
          <Button variant="outline" asChild>
            <a href="/Plantilla_Importacion.xlsx" download>
              <Download /> Descargar plantilla
            </a>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ImportWizard />
        <Card>
          <CardHeader>
            <CardTitle>Formato del archivo</CardTitle>
            <CardDescription>
              La primera fila tiene que tener estos encabezados. Si el código ya existe, el producto se actualiza.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Columna</TableHead>
                  <TableHead className="pr-6">Contenido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map(([name, desc, required]) => (
                  <TableRow key={name}>
                    <TableCell className="pl-6 font-mono text-xs">
                      {name}
                      {required && <span className="text-destructive"> *</span>}
                    </TableCell>
                    <TableCell className="pr-6 text-xs whitespace-normal text-muted-foreground">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

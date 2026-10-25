import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomerLoginForm } from "@/components/store/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

export default function CustomerLoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Ingresá a tu cuenta</CardTitle>
          <CardDescription>Seguí tus pedidos y comprá más rápido.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <CustomerLoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

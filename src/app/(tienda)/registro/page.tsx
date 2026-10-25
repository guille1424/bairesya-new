import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomerRegisterForm } from "@/components/store/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default function CustomerRegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Creá tu cuenta</CardTitle>
          <CardDescription>Guardamos tus datos para que pedir sea más rápido.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <CustomerRegisterForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { StaffLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingreso al panel",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.45_0.22_283/0.55),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.55_0.2_320/0.35),transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <Logo className="w-12 invert dark:invert" priority />
          <span className="text-xl font-semibold tracking-tight">BairesYa</span>
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Stock, ventas y pedidos en un solo lugar.
          </h1>
          <p className="text-zinc-300">
            Gestioná el inventario, cobrá en caja con el escáner y aprobá los pedidos de la tienda online.
          </p>
        </div>
        <p className="relative text-sm text-zinc-400">Panel de administración</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <Logo className="mx-auto w-20 lg:hidden" priority />
            <h2 className="text-2xl font-semibold tracking-tight">Iniciá sesión</h2>
            <p className="text-sm text-muted-foreground">Ingresá con tu usuario del equipo.</p>
          </div>
          <StaffLoginForm />
        </div>
      </section>
    </main>
  );
}

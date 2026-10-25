import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Logo className="w-24 opacity-80" />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">No encontramos esta página</h1>
        <p className="text-muted-foreground">Puede que la prenda ya no esté publicada o que el link esté mal escrito.</p>
      </div>
      <Button asChild>
        <Link href="/">Ir a la tienda</Link>
      </Button>
    </main>
  );
}

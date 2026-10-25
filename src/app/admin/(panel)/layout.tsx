import { Suspense } from "react";
import type { Metadata } from "next";
import { AppSidebar, AppSidebarSkeleton } from "@/components/admin/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { verifyStaff } from "@/lib/auth/dal";
import { countWebPending } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel BairesYa" },
  robots: { index: false },
};

async function AdminSidebar() {
  const user = await verifyStaff();
  const webPending = await countWebPending();
  return <AppSidebar user={user} webPending={webPending} />;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AdminSidebar />
      </Suspense>
      <SidebarInset>
        <header data-print="hide" className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <span className="text-sm text-muted-foreground">BairesYa</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

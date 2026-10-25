"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  LogOut,
  ScanBarcode,
  Shirt,
  UserCog,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { staffLogout } from "@/lib/actions/auth";
import type { StaffUser } from "@/lib/auth/dal";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType;
  adminOnly?: boolean;
  badge?: "webPending";
};

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "General",
    items: [{ title: "Dashboard", href: "/admin", icon: LayoutDashboard, adminOnly: true }],
  },
  {
    label: "Ventas",
    items: [
      { title: "Nuevo pedido", href: "/admin/nuevo-pedido", icon: ScanBarcode },
      { title: "Pedidos", href: "/admin/pedidos", icon: ClipboardList },
      { title: "Pedidos web", href: "/admin/pedidos-web", icon: Globe, badge: "webPending" },
      { title: "Clientes", href: "/admin/clientes", icon: Users },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Inventario", href: "/admin/inventario", icon: Shirt },
      { title: "Importar Excel", href: "/admin/importar", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Configuración",
    items: [{ title: "Usuarios", href: "/admin/usuarios", icon: UserCog, adminOnly: true }],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function SidebarBrand() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link href="/admin">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white p-1 ring-1 ring-border">
                <Logo className="w-full dark:invert-0" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">BairesYa</span>
                <span className="truncate text-xs text-muted-foreground">Panel de gestión</span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

export function AppSidebar({ user, webPending }: { user: StaffUser; webPending: number }) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  return (
    <Sidebar collapsible="icon">
      <SidebarBrand />
      <SidebarContent>
        {sections.map((section) => {
          const items = section.items.filter((item) => isAdmin || !item.adminOnly);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge === "webPending" && webPending > 0 && (
                        <SidebarMenuBadge className="bg-primary text-primary-foreground">{webPending}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ver tienda">
                  <Link href="/" target="_blank">
                    <ExternalLink />
                    <span>Ver tienda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function UserMenu({ user }: { user: StaffUser }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 font-medium text-primary uppercase">
                  {user.username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.username}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.role === "ADMIN" ? "Administrador" : "Empleado"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-48">
            <DropdownMenuLabel className="font-normal text-muted-foreground">Sesión iniciada</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={staffLogout} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="size-4" /> Cerrar sesión
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon">
      <SidebarBrand />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {[70, 55, 62, 48, 66, 58, 52].map((width, i) => (
              <SidebarMenuItem key={i} className="flex h-8 items-center gap-2 px-2">
                <Skeleton className="size-4 rounded-md" />
                <Skeleton className="h-4 group-data-[collapsible=icon]:hidden" style={{ width: `${width}%` }} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

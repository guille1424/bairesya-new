import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/skeletons";
import { UsersPanel } from "@/components/admin/users-panel";
import { verifyAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Usuarios" description="Quién puede entrar al panel y con qué permisos." />
      <Suspense fallback={<TableSkeleton rows={3} />}>
        <Users />
      </Suspense>
    </>
  );
}

async function Users() {
  const me = await verifyAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { username: "asc" }],
    select: { id: true, username: true, role: true, active: true, createdAt: true },
  });
  return <UsersPanel users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} currentUserId={me.id} />;
}

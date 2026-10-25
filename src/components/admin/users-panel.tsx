"use client";

import { useState } from "react";
import { KeyRound, MoreHorizontal, Plus, UserCheck, UserX } from "lucide-react";
import { FormError, SubmitButton, TextField, useActionForm, useOnActionSuccess } from "@/components/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createUser, resetPassword, setUserActive } from "@/lib/actions/users";
import { formatDate } from "@/lib/format";
import { ConfirmDialog } from "./confirm-button";

type UserRow = { id: string; username: string; role: "ADMIN" | "EMPLOYEE"; active: boolean; createdAt: string };

export function UsersPanel({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [toggling, setToggling] = useState<UserRow | null>(null);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nuevo usuario
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Creado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.username}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(vos)</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role === "ADMIN" ? "Administrador" : "Empleado"}</Badge>
                </TableCell>
                <TableCell>
                  {u.active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Activo</Badge>
                  ) : (
                    <Badge variant="outline">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setResetting(u)}>
                        <KeyRound /> Cambiar contraseña
                      </DropdownMenuItem>
                      {u.id !== currentUserId && (
                        <DropdownMenuItem variant={u.active ? "destructive" : "default"} onClick={() => setToggling(u)}>
                          {u.active ? <UserX /> : <UserCheck />} {u.active ? "Desactivar" : "Reactivar"}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Los empleados usan la caja, pedidos, clientes e inventario, sin ver costos ni el dashboard.</DialogDescription>
          </DialogHeader>
          {creating && <CreateUserForm onDone={() => setCreating(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={resetting !== null} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Nueva contraseña para &quot;{resetting?.username}&quot;.</DialogDescription>
          </DialogHeader>
          {resetting && <ResetPasswordForm userId={resetting.id} onDone={() => setResetting(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.active ? `¿Desactivar a "${toggling?.username}"?` : `¿Reactivar a "${toggling?.username}"?`}
        description={toggling?.active ? "No va a poder iniciar sesión. Podés reactivarlo cuando quieras." : "Va a poder volver a iniciar sesión."}
        confirmLabel={toggling?.active ? "Desactivar" : "Reactivar"}
        destructive={toggling?.active}
        action={() => setUserActive(toggling!.id, !toggling!.active)}
      />
    </>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const { state, pending, onSubmit } = useActionForm(createUser);
  const [role, setRole] = useState("EMPLOYEE");
  useOnActionSuccess(state, onDone);
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <FormError state={state} />
        <TextField label="Usuario" name="username" autoComplete="off" required autoFocus state={state} />
        <TextField label="Contraseña" name="password" type="password" autoComplete="new-password" required state={state} />
        <Field>
          <FieldLabel>Rol</FieldLabel>
          <input type="hidden" name="role" value={role} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">Empleado</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <SubmitButton pending={pending}>Crear usuario</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { state, pending, onSubmit } = useActionForm(resetPassword);
  useOnActionSuccess(state, onDone);
  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="id" value={userId} />
      <FieldGroup className="gap-4">
        <FormError state={state} />
        <TextField label="Nueva contraseña" name="password" type="password" autoComplete="new-password" required autoFocus state={state} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <SubmitButton pending={pending}>Guardar</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}

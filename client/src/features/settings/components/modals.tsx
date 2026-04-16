import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useCreateRole,
  useUpdateRole,
  useCreateArea,
  useUpdateArea,
} from "../api";

// ========================
// Shared
// ========================

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="mb-1 block text-sm font-medium">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// ========================
// User Modals
// ========================

export function CreateUserModal({ onClose, roles }: { onClose: () => void; roles: any[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const createUser = useCreateUser();
  const { toast } = useToast();

  const handleSubmit = () => {
    createUser.mutate(
      { name, email, password, role },
      {
        onSuccess: () => { toast({ title: "Usuario creado" }); onClose(); },
        onError: () => toast({ title: "Error al crear usuario", variant: "destructive" }),
      }
    );
  };

  return (
    <Modal title="Nuevo Usuario" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre" value={name} onChange={setName} />
        <FormField label="Email" value={email} onChange={setEmail} type="email" />
        <FormField label="Contrasena" value={password} onChange={setPassword} type="password" />
        <div>
          <Label className="mb-1 block text-sm font-medium">Rol</Label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {roles.map((r: any) => (
              <option key={r.name} value={r.name}>{r.displayName}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleSubmit} disabled={!name || !email || !password || createUser.isPending} className="w-full">
          Crear Usuario
        </Button>
      </div>
    </Modal>
  );
}

export function EditUserModal({ user, onClose, roles, currentUserId }: { user: any; onClose: () => void; roles: any[]; currentUserId?: number }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const handleSubmit = () => {
    updateUser.mutate(
      { id: user.id, name, email, role },
      {
        onSuccess: () => { toast({ title: "Usuario actualizado" }); onClose(); },
        onError: () => toast({ title: "Error al actualizar usuario", variant: "destructive" }),
      }
    );
  };

  return (
    <Modal title="Editar Usuario" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre" value={name} onChange={setName} />
        <FormField label="Email" value={email} onChange={setEmail} type="email" />
        <div>
          <Label className="mb-1 block text-sm font-medium">Rol</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={user.id === currentUserId}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            {roles.map((r: any) => (
              <option key={r.name} value={r.name}>{r.displayName}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleSubmit} disabled={!name || !email || updateUser.isPending} className="w-full">
          Guardar Cambios
        </Button>
      </div>
    </Modal>
  );
}

export function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const resetPassword = useResetPassword();
  const { toast } = useToast();

  const handleSubmit = () => {
    resetPassword.mutate(
      { id: user.id, newPassword },
      {
        onSuccess: () => { toast({ title: "Contraseña actualizada" }); onClose(); },
        onError: () => toast({ title: "Error al cambiar contraseña", variant: "destructive" }),
      }
    );
  };

  return (
    <Modal title={`Reset Contrasena — ${user.name}`} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nueva Contrasena" value={newPassword} onChange={setNewPassword} type="password" />
        <Button onClick={handleSubmit} disabled={newPassword.length < 8 || resetPassword.isPending} className="w-full">
          Actualizar Contrasena
        </Button>
      </div>
    </Modal>
  );
}

// ========================
// Role Modals
// ========================

export function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const createRole = useCreateRole();
  const { toast } = useToast();

  const handleSubmit = () => {
    createRole.mutate(
      { name, displayName, description, permissions: [] },
      {
        onSuccess: () => { toast({ title: "Rol creado" }); onClose(); },
        onError: () => toast({ title: "Error al crear rol", variant: "destructive" }),
      }
    );
  };

  return (
    <Modal title="Nuevo Rol" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Identificador (snake_case)" value={name} onChange={setName} placeholder="mi_rol" />
        <FormField label="Nombre a Mostrar" value={displayName} onChange={setDisplayName} />
        <FormField label="Descripcion" value={description} onChange={setDescription} />
        <Button onClick={handleSubmit} disabled={!name || !displayName || createRole.isPending} className="w-full">
          Crear Rol
        </Button>
      </div>
    </Modal>
  );
}

export function EditRoleModal({ role, onClose }: { role: any; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(role.displayName);
  const [description, setDescription] = useState(role.description || "");
  const updateRole = useUpdateRole();
  const { toast } = useToast();

  const handleSubmit = () => {
    updateRole.mutate(
      { id: role.id, displayName, description },
      {
        onSuccess: () => { toast({ title: "Rol actualizado" }); onClose(); },
        onError: () => toast({ title: "Error al actualizar rol", variant: "destructive" }),
      }
    );
  };

  return (
    <Modal title="Editar Rol" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre a Mostrar" value={displayName} onChange={setDisplayName} />
        <FormField label="Descripcion" value={description} onChange={setDescription} />
        <Button onClick={handleSubmit} disabled={!displayName || updateRole.isPending} className="w-full">
          Guardar Cambios
        </Button>
      </div>
    </Modal>
  );
}

// ========================
// Area Modals
// ========================

export function CreateAreaModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const createArea = useCreateArea();
  const { toast } = useToast();

  const handleSubmit = () => {
    createArea.mutate({ name }, {
      onSuccess: () => { toast({ title: "Área creada" }); onClose(); },
      onError: () => toast({ title: "Error al crear área", variant: "destructive" }),
    });
  };

  return (
    <Modal title="Nueva Area" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre del Area" value={name} onChange={setName} />
        <Button onClick={handleSubmit} disabled={!name || createArea.isPending} className="w-full">
          Crear Area
        </Button>
      </div>
    </Modal>
  );
}

export function EditAreaModal({ area, onClose }: { area: any; onClose: () => void }) {
  const [name, setName] = useState(area.name);
  const updateArea = useUpdateArea();
  const { toast } = useToast();

  const handleSubmit = () => {
    updateArea.mutate({ id: area.id, name }, {
      onSuccess: () => { toast({ title: "Área actualizada" }); onClose(); },
      onError: () => toast({ title: "Error al actualizar área", variant: "destructive" }),
    });
  };

  return (
    <Modal title="Editar Area" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nombre del Area" value={name} onChange={setName} />
        <Button onClick={handleSubmit} disabled={!name || updateArea.isPending} className="w-full">
          Guardar Cambios
        </Button>
      </div>
    </Modal>
  );
}

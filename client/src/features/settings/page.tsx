import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Shield,
  Building2,
  Layers,
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Package,
} from "lucide-react";
import {
  useSettingsUsers,
  useUserStats,
  useToggleUserActive,
  useRoles,
  useDeleteRole,
  useAreas,
  useDeleteArea,
  useCompany,
  useUpdateCompany,
  useUpdateCompanySettings,
  useModules,
} from "./api";
import {
  CreateUserModal,
  EditUserModal,
  ResetPasswordModal,
  CreateRoleModal,
  EditRoleModal,
  CreateAreaModal,
  EditAreaModal,
} from "./components/modals";

type TabKey = "usuarios" | "roles" | "areas" | "empresa" | "modulos";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "usuarios", label: "Usuarios", icon: <Users className="h-4 w-4" /> },
  { key: "roles", label: "Roles", icon: <Shield className="h-4 w-4" /> },
  { key: "areas", label: "Areas", icon: <Layers className="h-4 w-4" /> },
  { key: "empresa", label: "Empresa", icon: <Building2 className="h-4 w-4" /> },
  { key: "modulos", label: "Modulos", icon: <Package className="h-4 w-4" /> },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("usuarios");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">
          Administracion de usuarios, roles, areas y configuracion del sistema
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "usuarios" && <UsersTab currentUserId={user?.id} />}
      {activeTab === "roles" && <RolesTab />}
      {activeTab === "areas" && <AreasTab />}
      {activeTab === "empresa" && <EmpresaTab />}
      {activeTab === "modulos" && <ModulosTab />}
    </div>
  );
}

// ========================
// Users Tab
// ========================

function UsersTab({ currentUserId }: { currentUserId?: number }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [resetPwUser, setResetPwUser] = useState<any>(null);

  const { data: users = [] } = useSettingsUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter || undefined,
  });
  const { data: stats } = useUserStats();
  const toggleActive = useToggleUserActive();
  const { data: roles = [] } = useRoles();
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Usuarios" value={String(stats?.total || 0)} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard title="Activos" value={String(stats?.active || 0)} icon={<ToggleRight className="h-4 w-4 text-green-500" />} />
        <MetricCard title="Admins" value={String(stats?.admins || 0)} icon={<Shield className="h-4 w-4 text-red-500" />} />
        <MetricCard title="Activos 7d" value={String(stats?.activeRecent || 0)} icon={<RotateCcw className="h-4 w-4 text-blue-500" />} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar usuarios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos los roles</option>
          {roles.map((r: any) => <option key={r.name} value={r.name}>{r.displayName}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <Button onClick={() => setShowCreateModal(true)}><Plus className="mr-2 h-4 w-4" /> Nuevo Usuario</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState message="No hay usuarios que mostrar" />
          ) : (
            <div className="divide-y">
              {users.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.name}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-700"}`}>{u.role}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {u.email}
                      {u.lastLogin && <span className="ml-3">Ultimo acceso: {new Date(u.lastLogin).toLocaleDateString("es-MX")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingUser(u)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setResetPwUser(u)}><RotateCcw className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" disabled={u.id === currentUserId} onClick={() => toggleActive.mutate(u.id, { onError: () => toast({ title: "Error al cambiar estado", variant: "destructive" }) })}>
                      {u.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} roles={roles} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} roles={roles} currentUserId={currentUserId} />}
      {resetPwUser && <ResetPasswordModal user={resetPwUser} onClose={() => setResetPwUser(null)} />}
    </div>
  );
}

// ========================
// Roles Tab
// ========================

function RolesTab() {
  const { data: roles = [] } = useRoles();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const deleteRole = useDeleteRole();
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Roles del Sistema</h2>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Nuevo Rol</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {roles.length === 0 ? (
            <EmptyState message="No hay roles configurados" />
          ) : (
            <div className="divide-y">
              {roles.map((role: any) => (
                <div key={role.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.displayName}</span>
                      <span className="text-xs text-muted-foreground">({role.name})</span>
                      {role.isSystem && <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Sistema</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      {role.description && <span>{role.description}</span>}
                      <span>{role.userCount} usuarios</span>
                      <span>{(role.permissions || []).length} permisos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(role)}><Pencil className="h-4 w-4" /></Button>
                    {!role.isSystem && (
                      <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Eliminar el rol "${role.displayName}"?`)) deleteRole.mutate(role.id, { onError: () => toast({ title: "Error al eliminar rol", variant: "destructive" }) }); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
      {editing && <EditRoleModal role={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ========================
// Areas Tab
// ========================

function AreasTab() {
  const { data: areas = [] } = useAreas();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const deleteArea = useDeleteArea();
  const { toast } = useToast();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Areas / Departamentos</h2>
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Nueva Area</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {areas.length === 0 ? (
            <EmptyState message="No hay areas configuradas" />
          ) : (
            <div className="divide-y">
              {areas.map((area: any) => (
                <div key={area.id} className="flex items-center justify-between p-4">
                  <div>
                    <span className="font-medium">{area.name}</span>
                    <span className="ml-3 text-sm text-muted-foreground">{area.userCount} usuarios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(area)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (window.confirm(`Eliminar el area "${area.name}"?`)) deleteArea.mutate(area.id, { onError: () => toast({ title: "Error al eliminar área", variant: "destructive" }) }); }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {showCreate && <CreateAreaModal onClose={() => setShowCreate(false)} />}
      {editing && <EditAreaModal area={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ========================
// Empresa Tab
// ========================

function EmpresaTab() {
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();
  const updateSettings = useUpdateCompanySettings();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [locale, setLocale] = useState("es-MX");
  const [initialized, setInitialized] = useState(false);

  if (company && !initialized) {
    setName(company.name || "");
    const s = company.settings;
    if (s) {
      setLogoUrl(s.logoUrl || ""); setBrandColor(s.brandColor || ""); setIndustry(s.industry || "");
      setAddress(s.address || ""); setPhone(s.phone || ""); setWebsite(s.website || "");
      setTaxId(s.taxId || ""); setTimezone(s.timezone || "America/Mexico_City"); setLocale(s.locale || "es-MX");
    }
    setInitialized(true);
  }

  const handleSave = async () => {
    try {
      await Promise.all([
        updateCompany.mutateAsync({ name }),
        updateSettings.mutateAsync({ logoUrl: logoUrl || null, brandColor: brandColor || null, industry: industry || null, address: address || null, phone: phone || null, website: website || null, taxId: taxId || null, timezone, locale }),
      ]);
      toast({ title: "Configuración guardada" });
    } catch {
      toast({ title: "Error al guardar configuración", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Datos de la Empresa</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre" value={name} onChange={setName} />
            <FormField label="Logo URL" value={logoUrl} onChange={setLogoUrl} />
            <FormField label="Color de Marca" value={brandColor} onChange={setBrandColor} placeholder="#1e40af" />
            <FormField label="Industria" value={industry} onChange={setIndustry} />
            <FormField label="Direccion" value={address} onChange={setAddress} />
            <FormField label="Telefono" value={phone} onChange={setPhone} />
            <FormField label="Sitio Web" value={website} onChange={setWebsite} />
            <FormField label="RFC / Tax ID" value={taxId} onChange={setTaxId} />
            <FormField label="Timezone" value={timezone} onChange={setTimezone} />
            <FormField label="Locale" value={locale} onChange={setLocale} />
          </div>
          <Button onClick={handleSave} disabled={updateCompany.isPending || updateSettings.isPending}>Guardar Cambios</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================
// Modulos Tab
// ========================

function ModulosTab() {
  const { data: modules = [] } = useModules();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Modulos Instalados</h2>
      <Card>
        <CardContent className="p-0">
          {modules.length === 0 ? <EmptyState message="No se encontraron modulos" /> : (
            <div className="divide-y">
              {modules.map((mod: any) => (
                <div key={mod.name} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{mod.displayName || mod.name}</span>
                      <span className="text-xs text-muted-foreground">v{mod.version || "1.0.0"}</span>
                    </div>
                    {mod.description && <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>}
                  </div>
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Activo</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========================
// Shared Components
// ========================

function MetricCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label className="mb-1 block text-sm font-medium">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

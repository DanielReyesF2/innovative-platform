import { CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ExecutiveAvatar } from "@/lib/comercial-constants";
import { useAllUsers, type UserOption } from "../../api";

interface Props {
  elaboratedById: number | null;
  approvedById: number | null;
  onSave: (data: { elaboratedById?: number | null; approvedById?: number | null }) => void;
  disabled?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  director: "Director",
  operaciones: "Operaciones",
  comercial: "Comercial",
};

function UserSelector({
  label,
  icon,
  value,
  onChange,
  users,
  disabled,
  emptyHint,
  accentColor,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  onChange: (id: number | null) => void;
  users: UserOption[];
  disabled?: boolean;
  emptyHint: string;
  accentColor: string;
}) {
  const selected = users.find((u) => u.id === value);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-semibold text-[#1c2c4a]">
        <span style={{ color: accentColor }}>{icon}</span>
        {label}
      </Label>

      {/* Selected card preview */}
      {selected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
          <ExecutiveAvatar codigo={selected.codigo || "??"} name={selected.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#1c2c4a] truncate">{selected.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {ROLE_LABELS[selected.role] || selected.role} · {selected.email}
            </div>
          </div>
          <CheckCircle2 size={18} style={{ color: accentColor }} />
        </div>
      )}

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{emptyHint}</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({ROLE_LABELS[u.role] || u.role})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ValidacionSection({ elaboratedById, approvedById, onSave, disabled }: Props) {
  const { data: users = [], isLoading } = useAllUsers();

  if (isLoading) {
    return <p className="text-center text-sm text-muted-foreground py-6">Cargando usuarios...</p>;
  }

  // Common partition: operaciones/comercial roles for "elaborado", director/admin for "aprobado"
  const elaboratorPool = users.filter((u) => ["operaciones", "comercial", "admin", "director"].includes(u.role));
  const approverPool = users.filter((u) => ["director", "admin"].includes(u.role));

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Quién realizó el levantamiento y quién lo aprueba. Ambos campos quedan registrados como evidencia para auditoría.
      </p>

      <UserSelector
        label="Elaborado por"
        icon={<UserCheck size={16} />}
        value={elaboratedById}
        onChange={(id) => onSave({ elaboratedById: id })}
        users={elaboratorPool}
        disabled={disabled}
        emptyHint="— Selecciona quién elaboró —"
        accentColor="#0067B0"
      />

      <UserSelector
        label="Aprobado por"
        icon={<ShieldCheck size={16} />}
        value={approvedById}
        onChange={(id) => onSave({ approvedById: id })}
        users={approverPool}
        disabled={disabled}
        emptyHint="— Selecciona aprobador —"
        accentColor="#2E7D32"
      />
    </div>
  );
}

import { Label } from "@/components/ui/label";

interface Props {
  elaboratedById: number | null;
  approvedById: number | null;
  onSave: (data: { elaboratedById?: number | null; approvedById?: number | null }) => void;
  disabled?: boolean;
}

export default function ValidacionSection({ elaboratedById, approvedById, onSave, disabled }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Elaborado por (ID de usuario)</Label>
          <input
            type="number"
            value={elaboratedById ?? ""}
            onChange={(e) => onSave({ elaboratedById: e.target.value ? Number(e.target.value) : null })}
            disabled={disabled}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="ID del usuario..."
          />
        </div>
        <div>
          <Label>Aprobado por (ID de usuario)</Label>
          <input
            type="number"
            value={approvedById ?? ""}
            onChange={(e) => onSave({ approvedById: e.target.value ? Number(e.target.value) : null })}
            disabled={disabled}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="ID del usuario..."
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Estos campos se completarán con selectores de usuario cuando se implemente la integración completa.
      </p>
    </div>
  );
}

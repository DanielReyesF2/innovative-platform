import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "select";
  width?: string;
  /** Only used when type === "select". Dropdown options. A "Otro / escribir manual" option is appended automatically. */
  options?: string[];
}

interface EditableTableProps {
  columns: ColumnDef[];
  data: any[];
  onAdd: (item: any) => void;
  onUpdate: (itemId: number, data: any) => void;
  onDelete: (itemId: number) => void;
  disabled?: boolean;
  emptyText?: string;
}

const MANUAL_VALUE = "__manual__";

function CellEditor({
  col,
  value,
  onChange,
}: {
  col: ColumnDef;
  value: any;
  onChange: (v: any) => void;
}) {
  // For select cells: detect if current value is in options or is manual entry
  if (col.type === "select" && col.options) {
    const isManual = value && !col.options.includes(value);
    const [manualMode, setManualMode] = useState<boolean>(isManual);

    if (manualMode) {
      return (
        <div className="flex gap-1">
          <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escribir manual..."
            className="h-8 text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setManualMode(false);
              onChange("");
            }}
            className="text-[11px] text-muted-foreground px-1.5 hover:text-foreground"
            title="Volver a lista"
          >
            ←
          </button>
        </div>
      );
    }

    return (
      <select
        value={value && col.options.includes(value) ? value : ""}
        onChange={(e) => {
          if (e.target.value === MANUAL_VALUE) {
            setManualMode(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">— Selecciona —</option>
        {col.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={MANUAL_VALUE}>Otro / escribir manual...</option>
      </select>
    );
  }

  return (
    <Input
      type={col.type === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.label}
      className="h-8 text-sm"
    />
  );
}

export default function EditableTable({
  columns,
  data,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false,
  emptyText = "Sin registros",
}: EditableTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [newRow, setNewRow] = useState<any | null>(null);

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = () => {
    if (editingId) {
      const { id, surveyId, ...rest } = editData;
      onUpdate(editingId, rest);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const startNewRow = () => {
    const empty: any = {};
    columns.forEach((col) => {
      empty[col.key] = col.type === "number" ? "" : col.type === "boolean" ? false : "";
    });
    setNewRow(empty);
  };

  const saveNewRow = () => {
    if (!newRow) return;
    const hasValue = columns.some((col) => {
      const v = newRow[col.key];
      return v !== "" && v !== false && v !== null && v !== undefined;
    });
    if (!hasValue) return;
    onAdd(newRow);
    setNewRow(null);
  };

  const cancelNewRow = () => {
    setNewRow(null);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left p-2 font-medium text-muted-foreground"
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                </th>
              ))}
              {!disabled && <th className="w-20 p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b">
                {columns.map((col) => (
                  <td key={col.key} className="p-2">
                    {editingId === item.id ? (
                      <CellEditor
                        col={col}
                        value={editData[col.key]}
                        onChange={(v) => setEditData({ ...editData, [col.key]: v })}
                      />
                    ) : (
                      <span
                        className={!disabled ? "cursor-pointer hover:text-primary" : ""}
                        onClick={() => !disabled && startEdit(item)}
                      >
                        {item[col.key] ?? "—"}
                      </span>
                    )}
                  </td>
                ))}
                {!disabled && (
                  <td className="p-2">
                    <div className="flex gap-1">
                      {editingId === item.id ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={saveEdit} className="h-7 w-7 p-0">
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            className="h-7 w-7 p-0 text-muted-foreground"
                          >
                            ✕
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("¿Seguro que deseas eliminar este registro?")) onDelete(item.id);
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {/* New row */}
            {newRow && (
              <tr className="border-b bg-accent/30">
                {columns.map((col) => (
                  <td key={col.key} className="p-2">
                    <CellEditor
                      col={col}
                      value={newRow[col.key]}
                      onChange={(v) => setNewRow({ ...newRow, [col.key]: v })}
                    />
                  </td>
                ))}
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={saveNewRow} className="h-7 w-7 p-0">
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelNewRow}
                      className="h-7 w-7 p-0 text-muted-foreground"
                    >
                      ✕
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data.length === 0 && !newRow && <p className="text-center text-sm text-muted-foreground py-4">{emptyText}</p>}
      {!(disabled || newRow) && (
        <Button variant="outline" size="sm" onClick={startNewRow} className="gap-1">
          <Plus className="h-3 w-3" />
          Agregar
        </Button>
      )}
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean";
  width?: string;
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
                      <Input
                        type={col.type === "number" ? "number" : "text"}
                        value={editData[col.key] ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, [col.key]: e.target.value })
                        }
                        className="h-8 text-sm"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={saveEdit}
                            className="h-7 w-7 p-0"
                          >
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
                          onClick={() => { if (window.confirm("¿Seguro que deseas eliminar este registro?")) onDelete(item.id); }}
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
                    <Input
                      type={col.type === "number" ? "number" : "text"}
                      value={newRow[col.key] ?? ""}
                      onChange={(e) =>
                        setNewRow({ ...newRow, [col.key]: e.target.value })
                      }
                      placeholder={col.label}
                      className="h-8 text-sm"
                    />
                  </td>
                ))}
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveNewRow}
                      className="h-7 w-7 p-0"
                    >
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
      {data.length === 0 && !newRow && (
        <p className="text-center text-sm text-muted-foreground py-4">
          {emptyText}
        </p>
      )}
      {!disabled && !newRow && (
        <Button variant="outline" size="sm" onClick={startNewRow} className="gap-1">
          <Plus className="h-3 w-3" />
          Agregar
        </Button>
      )}
    </div>
  );
}

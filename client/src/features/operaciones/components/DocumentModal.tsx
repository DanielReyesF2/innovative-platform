import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useCreateDocument, useUpdateDocument } from "../api";

function toDateInput(value: unknown): string {
  if (!value) return "";
  const dt = new Date(value as string);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

// Create or edit an operational document (metadata only — no file upload).
// Editing the expiration date is the "renew" flow that clears a "vencido" badge.
export function DocumentModal({ doc, onClose }: { doc: any | null; onClose: () => void }) {
  const editing = !!doc;
  const [name, setName] = useState(doc?.name || "");
  const [type, setType] = useState(doc?.type || "");
  const [category, setCategory] = useState(doc?.category || "");
  const [issueDate, setIssueDate] = useState(toDateInput(doc?.issueDate));
  const [expirationDate, setExpirationDate] = useState(toDateInput(doc?.expirationDate));
  const [notes, setNotes] = useState(doc?.notes || "");
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const { toast } = useToast();
  const pending = createDoc.isPending || updateDoc.isPending;

  const handleSubmit = () => {
    const payload = {
      name,
      type,
      category,
      issueDate: issueDate || null,
      expirationDate: expirationDate || null,
      notes: notes || null,
    };
    const opts = {
      onSuccess: () => {
        toast({ title: editing ? "Documento actualizado" : "Documento creado" });
        onClose();
      },
      onError: () => toast({ title: "Error al guardar el documento", variant: "destructive" }),
    };
    if (editing) updateDoc.mutate({ id: doc.id, ...payload }, opts);
    else createDoc.mutate(payload, opts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{editing ? "Editar documento" : "Nuevo documento"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="space-y-3">
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Seguro, Licencia, Permiso..." />
          </Field>
          <Field label="Categoría">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Legal, Ambiental..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de emisión">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="Fecha de vencimiento">
              <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Notas">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button onClick={handleSubmit} disabled={!(name && type && category) || pending} className="w-full">
            {editing ? "Guardar cambios" : "Crear documento"}
          </Button>
        </div>
      </div>
    </div>
  );
}

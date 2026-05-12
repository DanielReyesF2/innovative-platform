import type { ProspectNote } from "@shared/schema/comercial";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Loader2, Pin, StickyNote, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useCreateNote, useDeleteNote, useProspectNotes, useToggleNotePin, useUpdateNote } from "../api";

interface ProspectNotesProps {
  prospectId: number;
}

export function ProspectNotes({ prospectId }: ProspectNotesProps) {
  const { toast } = useToast();
  const [newContent, setNewContent] = useState("");

  const { data: notes = [], isLoading } = useProspectNotes(prospectId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();

  const handleCreateNote = async () => {
    const content = newContent.trim();
    if (!content) return;
    try {
      await createNote.mutateAsync({ prospectId, content });
      setNewContent("");
    } catch {
      toast({ title: "No se pudo crear la nota", variant: "destructive" });
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote.mutateAsync({ prospectId, noteId });
    } catch {
      toast({ title: "No se pudo eliminar la nota", variant: "destructive" });
    }
  };

  const handleTogglePin = async (noteId: number) => {
    try {
      await togglePin.mutateAsync({ prospectId, noteId });
    } catch {
      toast({ title: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  // Sort notes: pinned first, then by date desc
  const sortedNotes = [...notes].sort((a: ProspectNote, b: ProspectNote) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h4 className="font-medium">Notas</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Clic en una nota para editarla. Enter para guardar, Esc para cancelar.
        </p>
      </div>

      {/* Create note — inline, no modal */}
      <div className="mb-4 bg-white rounded-lg border border-[#e5e7eb] p-3">
        <Textarea
          placeholder="Escribe una nueva nota..."
          value={newContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl + Enter para guardar; Enter solo hace salto de línea
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleCreateNote();
            }
          }}
          rows={2}
          className="resize-none border-0 focus-visible:ring-0 p-0 shadow-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter para guardar</span>
          <Button size="sm" onClick={handleCreateNote} disabled={!newContent.trim() || createNote.isPending}>
            {createNote.isPending ? "Guardando..." : "Agregar nota"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Sin notas — agrega la primera arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note: ProspectNote) => (
            <InlineNoteItem
              key={note.id}
              note={note}
              prospectId={prospectId}
              onDelete={() => handleDeleteNote(note.id)}
              onTogglePin={() => handleTogglePin(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single note row with click-to-edit content ───────────────────────────
function InlineNoteItem({
  note,
  prospectId,
  onDelete,
  onTogglePin,
}: {
  note: ProspectNote;
  prospectId: number;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const { toast } = useToast();
  const updateNote = useUpdateNote();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // When the note's content changes from the server (e.g., another tab), sync
  // the local draft — but only when we're not currently editing to avoid
  // clobbering what the user is typing.
  useEffect(() => {
    if (!editing) setDraft(note.content);
  }, [note.content, editing]);

  const startEdit = () => {
    setDraft(note.content);
    setEditing(true);
    // Focus + place cursor at end after the textarea mounts
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(note.content.length, note.content.length);
    }, 0);
  };

  const cancelEdit = () => {
    setDraft(note.content);
    setEditing(false);
  };

  const save = async () => {
    const next = draft.trim();
    if (!next || next === note.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateNote.mutateAsync({ prospectId, noteId: note.id, content: next });
    } catch {
      toast({ title: "No se pudo actualizar la nota", variant: "destructive" });
      setDraft(note.content);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  return (
    <div
      className={`group bg-card border rounded-lg p-4 transition-colors ${
        note.isPinned ? "border-yellow-400 bg-yellow-50/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            rows={Math.min(10, Math.max(3, draft.split("\n").length))}
            className="flex-1 resize-none border-[#00a8a8] focus-visible:ring-[#00a8a8]/30"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="flex-1 text-left cursor-text -m-1 p-1 rounded hover:bg-[#f9fafb] transition-colors"
            title="Clic para editar"
          >
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          </button>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9ca3af]" />}
          {editing && !saving && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                save();
              }}
              className="text-[#00a8a8] hover:bg-[#00a8a8]/10 p-1.5 rounded-md transition-colors"
              title="Guardar (⌘/Ctrl + Enter)"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1.5 rounded-md transition-colors ${
              note.isPinned
                ? "text-yellow-600 hover:bg-yellow-100"
                : "text-[#9ca3af] hover:text-[#1c2c4a] hover:bg-[#f3f4f6] opacity-0 group-hover:opacity-100"
            }`}
            title={note.isPinned ? "Desfijar" : "Fijar"}
          >
            <Pin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-[#9ca3af] hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {note.createdAt ? format(new Date(note.createdAt), "PPp", { locale: es }) : ""}
        {note.updatedAt && note.updatedAt !== note.createdAt && (
          <span className="ml-2 text-[10px] text-[#9ca3af]">· editada</span>
        )}
      </p>
    </div>
  );
}

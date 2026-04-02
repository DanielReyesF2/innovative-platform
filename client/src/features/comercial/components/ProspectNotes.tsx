import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StickyNote, Plus, Pin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  useProspectNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
} from "../api";
import type { ProspectNote } from "@shared/schema/comercial";

interface ProspectNotesProps {
  prospectId: number;
}

export function ProspectNotes({ prospectId }: ProspectNotesProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: number; content: string } | null>(null);
  const [newContent, setNewContent] = useState("");

  const { data: notes = [], isLoading } = useProspectNotes(prospectId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();

  const handleCreateNote = async () => {
    if (!newContent.trim()) {
      toast({
        title: "Error",
        description: "El contenido es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      await createNote.mutateAsync({
        prospectId,
        content: newContent,
      });
      toast({ title: "Nota creada" });
      setIsDialogOpen(false);
      setNewContent("");
    } catch {
      toast({
        title: "Error",
        description: "No se pudo crear la nota",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return;

    try {
      await updateNote.mutateAsync({
        prospectId,
        noteId: editingNote.id,
        content: editingNote.content,
      });
      toast({ title: "Nota actualizada" });
      setEditingNote(null);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar la nota",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      await deleteNote.mutateAsync({ prospectId, noteId });
      toast({ title: "Nota eliminada" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive",
      });
    }
  };

  const handleTogglePin = async (noteId: number) => {
    try {
      await togglePin.mutateAsync({ prospectId, noteId });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado",
        variant: "destructive",
      });
    }
  };

  // Sort notes: pinned first, then by date
  const sortedNotes = [...notes].sort((a: ProspectNote, b: ProspectNote) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Notas</h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Nota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Nota</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Textarea
                placeholder="Escribe tu nota aqui..."
                value={newContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewContent(e.target.value)}
                rows={5}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateNote} disabled={createNote.isPending}>
                  {createNote.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No hay notas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotes.map((note: ProspectNote) => (
            <div
              key={note.id}
              className={`bg-card border rounded-lg p-4 ${
                note.isPinned ? "border-yellow-400 bg-yellow-50/50" : ""
              }`}
            >
              {editingNote && editingNote.id === note.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editingNote.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingNote({ id: editingNote.id, content: e.target.value })
                    }
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingNote(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpdateNote}
                      disabled={updateNote.isPending}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTogglePin(note.id)}>
                          <Pin className="h-4 w-4 mr-2" />
                          {note.isPinned ? "Desfijar" : "Fijar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setEditingNote({ id: note.id, content: note.content })
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.createdAt
                      ? format(new Date(note.createdAt), "PPp", { locale: es })
                      : ""}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

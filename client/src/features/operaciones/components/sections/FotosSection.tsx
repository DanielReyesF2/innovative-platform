import { Image, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { photosApi } from "../../api";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function FotosSection({ surveyId, disabled }: Props) {
  const { toast } = useToast();
  const { data: photos = [] } = photosApi.useItems(surveyId);
  const createMutation = photosApi.useCreate();
  const deleteMutation = photosApi.useDelete();
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    createMutation.mutate(
      {
        surveyId,
        url: newUrl,
        caption: newCaption || null,
        section: "general",
      },
      {
        onError: () => {
          toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
        },
      },
    );
    setNewUrl("");
    setNewCaption("");
  };

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo: any) => (
            <div key={photo.id} className="relative group rounded-lg border overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="p-2 text-xs text-muted-foreground truncate">{photo.caption || photo.url}</div>
              {!disabled && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() =>
                    deleteMutation.mutate(
                      { surveyId, itemId: photo.id },
                      {
                        onError: () => {
                          toast({
                            title: "Error al eliminar",
                            description: "Intenta de nuevo",
                            variant: "destructive",
                          });
                        },
                      },
                    )
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">No hay fotografías registradas</p>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL de la imagen..."
            className="flex-1"
          />
          <Input
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="Descripción..."
            className="w-48"
          />
          <Button onClick={handleAdd} size="sm" className="gap-1">
            <Plus className="h-3 w-3" />
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

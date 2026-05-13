import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { photosApi, useUploadPhoto } from "../../api";

interface Props {
  surveyId: number;
  disabled?: boolean;
}

export default function FotosSection({ surveyId, disabled }: Props) {
  const { toast } = useToast();
  const { data: photos = [] } = photosApi.useItems(surveyId);
  const deleteMutation = photosApi.useDelete();
  const uploadMutation = useUploadPhoto();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        await uploadMutation.mutateAsync({
          surveyId,
          file,
          section: "general",
        });
      } catch {
        toast({
          title: "Error al subir foto",
          description: file.name,
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    // Reset inputs so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleDelete = (photoId: number) => {
    deleteMutation.mutate(
      { surveyId, itemId: photoId },
      {
        onSuccess: () => {
          setConfirmDelete(null);
          if (previewPhoto?.id === photoId) setPreviewPhoto(null);
        },
        onError: () => {
          toast({ title: "Error al eliminar", variant: "destructive" });
        },
      },
    );
  };

  const getPhotoUrl = (photo: any) => {
    if (!photo.url) return "";
    // If it starts with /uploads, it's a local file served by our API
    if (photo.url.startsWith("/uploads/")) {
      return `/api/operaciones${photo.url}`;
    }
    return photo.url;
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Action buttons */}
      {!disabled && (
        <div className="flex gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#0067B0]/30 bg-[#0067B0]/5 text-[#0067B0] font-semibold text-sm hover:bg-[#0067B0]/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            <Camera size={22} />
            Tomar Foto
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#7C3AED]/30 bg-[#7C3AED]/5 text-[#7C3AED] font-semibold text-sm hover:bg-[#7C3AED]/10 transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            <ImagePlus size={22} />
            Galería
          </button>
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-[#0067B0]">
          <Loader2 size={16} className="animate-spin" />
          Subiendo fotos...
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo: any) => (
            <div
              key={photo.id}
              className="relative rounded-xl overflow-hidden border border-[#e5e7eb] bg-white shadow-sm"
            >
              {/* Photo thumbnail — clickable for preview */}
              <button
                onClick={() => setPreviewPhoto(photo)}
                className="w-full aspect-[4/3] bg-[#f3f4f6] overflow-hidden"
              >
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption || "Foto de levantamiento"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback for broken images
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </button>

              {/* Caption */}
              {photo.caption && (
                <div className="px-2 py-1.5 text-[11px] text-[#6b7280] truncate">
                  {photo.caption}
                </div>
              )}

              {/* Delete button — always visible on touch, hover on desktop */}
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(photo.id);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-red-600 transition-colors active:scale-90 sm:opacity-0 sm:group-hover:opacity-100"
                  style={{ opacity: 1 }} // Always visible for touch
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !uploading && (
          <div className="py-8 text-center">
            <Camera size={32} className="mx-auto mb-2 text-[#d1d5db]" />
            <p className="text-sm text-[#9ca3af]">
              {disabled ? "No hay fotografías registradas" : "Toma fotos o selecciona de tu galería"}
            </p>
          </div>
        )
      )}

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-[11px] text-[#9ca3af] text-center">
          {photos.length} {photos.length === 1 ? "fotografía" : "fotografías"}
        </p>
      )}

      {/* ═══ Full-screen photo preview ═══ */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
          >
            <X size={24} />
          </button>
          <img
            src={getPhotoUrl(previewPhoto)}
            alt={previewPhoto.caption || "Foto"}
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {previewPhoto.caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/60 text-white text-sm max-w-md text-center">
              {previewPhoto.caption}
            </div>
          )}
        </div>
      )}

      {/* ═══ Delete confirmation ═══ */}
      {confirmDelete !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1c2c4a] mb-2">Eliminar foto</h3>
            <p className="text-sm text-[#6b7280] mb-5">
              Esta acción no se puede deshacer. ¿Estás seguro?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

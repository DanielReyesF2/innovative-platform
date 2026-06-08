import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Loader2,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getAuthToken } from "@/lib/queryClient";

type OrphanFile = {
  kind: "document" | "proposal";
  id: number;
  prospectId: number;
  prospectName: string;
  name: string;
};

type RestoreResult = {
  restored: { name: string; prospectName: string; kind: OrphanFile["kind"] }[];
  unmatched: string[];
  duplicates: string[];
  restoredCount: number;
  remaining: number;
  totalBefore: number;
};

const ORPHANS_KEY = "/api/comercial/restore/orphans";

export function RestoreFilesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);

  const { data: orphans = [], isLoading } = useQuery<OrphanFile[]>({ queryKey: [ORPHANS_KEY] });

  const docCount = orphans.filter((o) => o.kind === "document").length;
  const propCount = orphans.filter((o) => o.kind === "proposal").length;

  const upload = useMutation({
    mutationFn: async (files: File[]): Promise<RestoreResult> => {
      const formData = new FormData();
      for (const f of files) formData.append("files", f);

      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/comercial/restore/bulk", {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al recuperar archivos");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: [ORPHANS_KEY] });
      if (data.restoredCount > 0) {
        toast({ title: `${data.restoredCount} archivo(s) reconectado(s)` });
      } else {
        toast({
          title: "Ningún archivo coincidió",
          description: "Revisa que los nombres de archivo sean los originales.",
          variant: "destructive",
        });
      }
    },
    onError: (e: unknown) => {
      toast({
        title: "Error al recuperar archivos",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    },
  });

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    upload.mutate(Array.from(fileList));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Recuperación de archivos</h2>
        <p className="text-sm text-muted-foreground">
          Arrastra aquí los archivos que faltan. El sistema los reconecta automáticamente a su
          registro casando por nombre — no hay que capturar nada.
        </p>
      </div>

      {/* Resumen de lo que falta */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Archivos faltantes"
          value={isLoading ? "…" : String(orphans.length)}
          tone={orphans.length === 0 ? "ok" : "warn"}
        />
        <SummaryCard label="Documentos de prospectos" value={isLoading ? "…" : String(docCount)} />
        <SummaryCard label="Propuestas" value={isLoading ? "…" : String(propCount)} />
      </div>

      {/* Dropzone */}
      <Card>
        <CardContent className="pt-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            disabled={upload.isPending}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            } ${upload.isPending ? "cursor-wait opacity-70" : "cursor-pointer"}`}
          >
            {upload.isPending ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium">Subiendo y reconectando…</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Arrastra los archivos aquí</p>
                  <p className="text-sm text-muted-foreground">
                    o haz clic para seleccionar — puedes soltar muchos a la vez
                  </p>
                </div>
              </>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {/* Resultado de la última carga */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado de la recuperación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <ResultBadge
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="ok"
                label={`${result.restoredCount} reconectados`}
              />
              {result.unmatched.length > 0 && (
                <ResultBadge
                  icon={<FileWarning className="h-4 w-4" />}
                  tone="warn"
                  label={`${result.unmatched.length} sin registro`}
                />
              )}
              {result.duplicates.length > 0 && (
                <ResultBadge
                  icon={<RotateCcw className="h-4 w-4" />}
                  tone="muted"
                  label={`${result.duplicates.length} ya estaban`}
                />
              )}
              <ResultBadge
                icon={<AlertTriangle className="h-4 w-4" />}
                tone={result.remaining === 0 ? "ok" : "muted"}
                label={`${result.remaining} aún faltan`}
              />
            </div>

            {result.unmatched.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">
                  No encontré registro para estos archivos (¿nombre cambiado?):
                </p>
                <ul className="space-y-0.5 text-sm text-muted-foreground">
                  {result.unmatched.map((n) => (
                    <li key={n} className="truncate">
                      • {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de lo que aún falta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Archivos que aún faltan ({isLoading ? "…" : orphans.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando…</div>
          ) : orphans.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="font-medium">Todo recuperado</p>
              <p className="text-sm text-muted-foreground">No queda ningún archivo por reconectar.</p>
            </div>
          ) : (
            <div className="max-h-96 divide-y overflow-y-auto">
              {orphans.map((o) => (
                <div key={`${o.kind}:${o.id}`} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.prospectName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {o.kind === "document" ? "Documento" : "Propuesta"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn";
}) {
  const valueColor =
    tone === "ok" ? "text-green-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ResultBadge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "ok" | "warn" | "muted";
}) {
  const styles =
    tone === "ok"
      ? "bg-green-100 text-green-700"
      : tone === "warn"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${styles}`}>
      {icon}
      {label}
    </span>
  );
}

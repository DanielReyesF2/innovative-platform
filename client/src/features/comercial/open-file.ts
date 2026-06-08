import { apiRequest } from "@/lib/queryClient";

// Abre un archivo de prospecto (documento o propuesta) de forma AUTENTICADA.
//
// El endpoint de servido (`/api/comercial/uploads/:prospectId/:filename`) está
// detrás de requireAuth, así que no se puede usar un `<a href>` plano (no lleva
// el token). Pedimos el endpoint con apiRequest (que agrega el Bearer) y:
//   - si responde JSON {url} → abrimos la signed URL de GCS (caso producción).
//   - si responde el archivo directo → lo abrimos vía blob (disco legacy / dev).
export async function openProspectFile(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith("/api/comercial/uploads/")) {
    // urls legacy rotas (`/uploads/...`, `local://...`) o vacías: no hay archivo.
    throw new Error("Archivo no disponible");
  }

  const res = await apiRequest("GET", url);
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { url?: string };
    if (!data?.url) throw new Error("Archivo no disponible");
    window.open(data.url, "_blank", "noopener,noreferrer");
    return;
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

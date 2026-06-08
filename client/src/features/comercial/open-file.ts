import { apiRequest } from "@/lib/queryClient";

// Abre un archivo de prospecto (documento o propuesta) de forma AUTENTICADA.
//
// El endpoint de servido (`/api/comercial/uploads/:prospectId/:filename`) está
// detrás de requireAuth y manda el archivo en streaming, así que no se puede usar
// un `<a href>` plano (no lleva el token). Lo pedimos con apiRequest (que agrega
// el Bearer), recibimos los bytes y los abrimos en una pestaña nueva vía blob.
//
// Usamos un <a>.click() en vez de window.open() porque éste último suele ser
// bloqueado por el navegador cuando se llama después de un await (se "gasta" el
// gesto del usuario).
export async function openProspectFile(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith("/api/comercial/uploads/")) {
    // urls legacy rotas (`/uploads/...`, `local://...`) o vacías: no hay archivo.
    throw new Error("Archivo no disponible");
  }

  const res = await apiRequest("GET", url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

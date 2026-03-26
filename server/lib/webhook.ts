/**
 * Generic webhook trigger for n8n integrations.
 * Sends a POST with JSON payload to the given URL.
 * Returns true if the webhook responded 2xx, false otherwise.
 */
export async function triggerWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`[webhook] POST ${url} responded ${res.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[webhook] Request failed:", error);
    return false;
  }
}

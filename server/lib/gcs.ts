import { Storage } from "@google-cloud/storage";

/**
 * Cloud Storage helper for ephemeral-filesystem environments (Cloud Run).
 *
 * Authentication:
 * - On Cloud Run: ADC (Application Default Credentials) via attached service account. No env var needed.
 * - Locally: set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *
 * Required env: GCS_BUCKET (target bucket name, e.g. "innovative-uploads-prod")
 */

const BUCKET_NAME = process.env.GCS_BUCKET;

if (!BUCKET_NAME && process.env.NODE_ENV === "production") {
  console.warn("[gcs] GCS_BUCKET env var not set — file uploads will fail in production.");
}

const storage = new Storage();

function getBucket() {
  if (!BUCKET_NAME) {
    throw new Error("GCS_BUCKET env var not set. Cannot upload files.");
  }
  return storage.bucket(BUCKET_NAME);
}

/**
 * Upload a file buffer to GCS. Returns the object path (not a public URL).
 *
 * @param key  Object path inside the bucket (e.g. "operaciones/123/photo.jpg"). Sanitize the filename before passing.
 * @param buffer  Raw file bytes (from multer.memoryStorage)
 * @param contentType  MIME type
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ key: string }> {
  const file = getBucket().file(key);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0, no-transform" },
  });
  return { key };
}

/**
 * Generate a short-lived signed URL to read an object.
 * Default TTL 15 minutes.
 */
export async function getSignedReadUrl(key: string, ttlSeconds = 15 * 60): Promise<string> {
  const file = getBucket().file(key);
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + ttlSeconds * 1000,
  });
  return url;
}

/**
 * Stream an object from GCS through the response. Use for serving small/medium
 * files when redirecting to a signed URL is not desired (e.g. avoid CORS issues).
 */
export async function streamObject(key: string, res: import("express").Response): Promise<void> {
  const file = getBucket().file(key);
  const [metadata] = await file.getMetadata();
  if (metadata.contentType) res.setHeader("Content-Type", metadata.contentType);
  if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
  res.setHeader("Cache-Control", "private, max-age=0, no-transform");
  await new Promise<void>((resolve, reject) => {
    file
      .createReadStream()
      .on("error", reject)
      .on("end", () => resolve())
      .pipe(res);
  });
}

/**
 * Delete an object. Idempotent — does not throw if it doesn't exist.
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getBucket().file(key).delete();
  } catch (error: unknown) {
    const code = (error as { code?: number }).code;
    if (code === 404) return; // already gone
    throw error;
  }
}

/**
 * Check if a key already starts with "/uploads/" (legacy local-disk URL).
 * Use during migration period to fall back to local serving.
 */
export function isLegacyLocalUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith("/uploads/");
}

export const gcsEnabled = !!BUCKET_NAME;

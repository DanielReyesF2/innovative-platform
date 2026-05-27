import "dotenv/config";
import compression from "compression";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "http";
import { pool } from "./db";
import { loadModules } from "./module-loader";

const app = express();

// Behind reverse proxy (Railway, Cloud Run, etc.) — required for
// express-rate-limit to see real client IP. Without this, rate limits
// are global per process, not per-IP (brute force becomes trivial).
app.set("trust proxy", 1);

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
      },
    },
  }),
);

// Global rate limiting for API endpoints (100 req/min per IP)
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/healthz",
  }),
);

// Compression (skip SSE streams)
app.use(
  compression({
    filter: (req) => {
      if (req.headers.accept === "text/event-stream") return false;
      return true;
    },
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Liveness probe — process is up (Cloud Run startupProbe target)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness probe — process AND database are reachable (Cloud Run livenessProbe target)
app.get("/api/healthz", async (_req, res) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
      clearTimeout(timer);
    }
    res.json({ status: "ok", db: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[health] DB ping failed:", error);
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

// Load all modules dynamically
console.log("[server] Cargando módulos de API…");
await loadModules(app);

// In production, serve static files
if (process.env.NODE_ENV === "production") {
  const path = await import("path");
  const publicDir = path.resolve(import.meta.dirname, "public");
  // Hashed assets (JS/CSS) — cache forever (hash changes on content change)
  app.use(
    "/assets",
    express.static(path.join(publicDir, "assets"), {
      maxAge: "1y",
      immutable: true,
    }),
  );

  // Everything else (HTML, favicon, etc.) — no cache so deploys take effect immediately
  app.use(
    express.static(publicDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );

  // SPA fallback — serve index.html for non-API routes (always fresh)
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(publicDir, "index.html"));
  });
} else {
  // In development, set up Vite HMR middleware (la primera vez puede tardar varios minutos)
  console.log("[server] Iniciando Vite en modo middleware (espera…)");
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  console.log("[server] Vite listo.");
}

// Start server
const PORT = parseInt(process.env.PORT || "5000", 10);
const server = createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

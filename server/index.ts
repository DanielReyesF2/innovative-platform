import "dotenv/config";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import { createServer } from "http";
import { loadModules } from "./module-loader";

const app = express();

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
      },
    },
  })
);

// Compression (skip SSE streams)
app.use(
  compression({
    filter: (req) => {
      if (req.headers.accept === "text/event-stream") return false;
      return true;
    },
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Load all modules dynamically
await loadModules(app);

// In production, serve static files
if (process.env.NODE_ENV === "production") {
  const path = await import("path");
  const publicDir = path.resolve(import.meta.dirname, "public");
  app.use(express.static(publicDir));

  // SPA fallback — serve index.html for non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
} else {
  // In development, set up Vite HMR middleware
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// Start server
const PORT = parseInt(process.env.PORT || "5000", 10);
const server = createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] Running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

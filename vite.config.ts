import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, "client"),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
    // Only resolve .ts/.tsx — prevents .jsx from ever overriding .tsx
    extensions: [".ts", ".tsx", ".js", ".json"],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["date-fns"],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    // Evita calcular gzip en consola (ahorra tiempo al final del build)
    reportCompressedSize: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});

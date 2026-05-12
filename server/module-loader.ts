import type { Express } from "express";
import fs from "fs";
import path from "path";
import { moduleRouters } from "./module-registry";

export interface ModuleManifest {
  name: string;
  displayName: string;
  version: string;
  description: string;
  icon: string;
  navOrder: number;
  showInNav: boolean;
  basePath: string;
  apiPrefix: string;
  dependencies: string[];
  requiredEnvVars: string[];
  hasNovaTools: boolean;
}

const loadedModules: ModuleManifest[] = [];

export async function loadModules(app: Express) {
  const modulesDir = path.join(import.meta.dirname, "modules");

  if (!fs.existsSync(modulesDir)) {
    console.log("[modules] No modules directory found, skipping module loading");
    return;
  }

  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(modulesDir, entry.name, "module.json");
    if (!fs.existsSync(manifestPath)) {
      console.warn(`[modules] Skipping ${entry.name} — no module.json found`);
      continue;
    }

    try {
      const manifest: ModuleManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

      // Validate required env vars
      for (const envVar of manifest.requiredEnvVars || []) {
        if (!process.env[envVar]) {
          console.warn(`[modules] Warning: ${manifest.name} requires ${envVar} but it's not set`);
        }
      }

      // Use statically registered router from module-registry
      const router = moduleRouters[entry.name];

      if (router) {
        app.use(manifest.apiPrefix, router);
        console.log(`[modules] Mounted ${manifest.name} v${manifest.version} at ${manifest.apiPrefix}`);
      } else {
        console.warn(`[modules] No router registered for ${entry.name}`);
      }

      loadedModules.push(manifest);
    } catch (error) {
      console.error(`[modules] Failed to load ${entry.name}:`, error);
    }
  }

  // Endpoint for frontend to know which modules are available
  app.get("/api/modules", (_req, res) => {
    res.json(
      loadedModules
        .filter((m) => m.showInNav)
        .sort((a, b) => a.navOrder - b.navOrder)
        .map((m) => ({
          name: m.name,
          displayName: m.displayName,
          icon: m.icon,
          basePath: m.basePath,
          navOrder: m.navOrder,
        })),
    );
  });

  console.log(`[modules] Loaded ${loadedModules.length} modules total`);
}

export function getLoadedModules(): readonly ModuleManifest[] {
  return loadedModules;
}

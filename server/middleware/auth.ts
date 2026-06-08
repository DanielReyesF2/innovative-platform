import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { hasPermission } from "../../shared/auth/permissions";
import { roles } from "../../shared/schema/settings";
import { db } from "../db";

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable must be set.");
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number | null;
}

export function generateToken(user: JwtPayload): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.warn("[auth] Token verification failed:", reason);
    return null;
  }
}

// Middleware: Require authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: "No authentication token provided" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = payload;
  next();
}

// Middleware: Require admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Middleware: Require specific role (legacy — prefer requirePermission)
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!(user && allowed.includes(user.role))) {
      return res.status(403).json({ message: `Requires one of: ${allowed.join(", ")}` });
    }
    next();
  };
}

// Role → permissions cache (Opción B). Loaded once and refreshed when a role is
// edited (settings updateRole calls clearRolePermsCache). Avoids a DB hit per
// request and matches how seedSystemRoles/getRoles already resolve `roles`.
let rolePermsCache: Map<string, string[]> | null = null;

async function loadRolePerms(): Promise<Map<string, string[]>> {
  if (rolePermsCache) return rolePermsCache;
  const rows = await db.query.roles.findMany();
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.name, (r.permissions as string[] | null) ?? []);
  rolePermsCache = map;
  return map;
}

export function clearRolePermsCache(): void {
  rolePermsCache = null;
}

// Middleware: Require a specific permission. Resolves the user's role to its
// permission list and passes if it includes the permission (or the "*" wildcard).
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "No authentication token provided" });
    }
    try {
      const perms = await loadRolePerms();
      if (hasPermission(perms.get(user.role), permission)) {
        return next();
      }
      return res.status(403).json({ message: `Requires permission: ${permission}` });
    } catch (error) {
      console.error("[auth] requirePermission load error:", error);
      return res.status(500).json({ message: "Authorization error" });
    }
  };
}

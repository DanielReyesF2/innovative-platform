import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../../db";
import { users } from "../../../shared/schema/common";
import { generateToken, requireAuth, requireAdmin } from "../../middleware/auth";
import { loginUser } from "./service";
import { eq } from "drizzle-orm";

// Zod schemas for auth routes
const loginSchema = z.object({
  username: z.string().min(1, "Username es requerido").max(255),
  password: z.string().min(1, "Password es requerido").max(255),
});

const registerSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(255),
  email: z.string().email("Email inválido").max(255),
  password: z.string().min(8, "Password debe tener al menos 8 caracteres").max(255),
  companyId: z.number().int().positive().nullable().optional(),
  areaId: z.number().int().positive().nullable().optional(),
});

export const router = Router();

// Rate limiting for auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Demasiados intentos de login. Intenta de nuevo en 15 minutos.",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "Demasiados intentos de registro. Intenta de nuevo mas tarde.",
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }

    const { username, password } = parsed.data;

    const result = await loginUser(username, password);
    if (!result) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    res.json(result);
  } catch (error) {
    console.error("[auth] Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/auth/register (admin only — users are created from Settings)
router.post("/register", requireAuth, requireAdmin, registerLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }

    const { name, email, password, companyId, areaId } = parsed.data;

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      return res.status(409).json({ message: "El email ya esta registrado" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "viewer",
        companyId: companyId ?? null,
        areaId: areaId ?? null,
        isActive: true,
      })
      .returning();

    const { password: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (error) {
    console.error("[auth] Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/auth/user — Get current authenticated user
router.get("/user", requireAuth, async (req, res) => {
  try {
    const tokenUser = req.user!;

    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenUser.id),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("[auth] Get user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/auth/team — List team members (any authenticated user, minimal fields)
router.get("/team", requireAuth, async (_req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      columns: { id: true, name: true, role: true, codigo: true, areaId: true, isActive: true },
    });
    res.json(allUsers.filter(u => u.isActive));
  } catch (error) {
    console.error("[auth] List team error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/auth/users — List all users (admin only)
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany();
    const safeUsers = allUsers.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    console.error("[auth] List users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

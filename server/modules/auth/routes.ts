import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { db } from "../../db";
import { users } from "../../../shared/schema/common";
import { generateToken, requireAuth, requireAdmin } from "../../middleware/auth";
import { loginUser } from "./service";
import { eq } from "drizzle-orm";

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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const result = await loginUser(username, password);
    if (!result) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    res.json(result);
  } catch (error) {
    console.error("[auth] Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/auth/register
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { name, email, password, companyId, areaId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

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
        companyId: companyId || null,
        areaId: areaId || null,
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
    const tokenUser = (req as any).user;

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

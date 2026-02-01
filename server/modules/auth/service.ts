import bcrypt from "bcrypt";
import { db } from "../../db";
import { users } from "../../../shared/schema/common";
import { generateToken } from "../../middleware/auth";
import { eq, ilike } from "drizzle-orm";

// Login user by email (or email prefix) and password
export async function loginUser(
  username: string,
  password: string
): Promise<{ token: string; user: Record<string, unknown> } | null> {
  try {
    // Find user by exact email or email prefix
    let user = await db.query.users.findFirst({
      where: eq(users.email, username.toLowerCase()),
    });

    // If not found by exact email, try prefix match
    if (!user) {
      user = await db.query.users.findFirst({
        where: ilike(users.email, `${username}%`),
      });
    }

    if (!user) return null;

    // Check if account is active
    if (user.isActive === false) return null;

    // Verify password — only accept bcrypt hashes
    if (
      !user.password.startsWith("$2a$") &&
      !user.password.startsWith("$2b$") &&
      !user.password.startsWith("$2y$")
    ) {
      console.error("[auth] SECURITY: Password not hashed with bcrypt");
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return null;

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Generate token
    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const { password: _, ...safeUser } = user;
    return { token, user: safeUser };
  } catch (error) {
    console.error("[auth] Login error:", error);
    return null;
  }
}

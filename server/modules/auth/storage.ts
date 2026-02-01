import { db } from "../../db";
import { users, type User, type InsertUser } from "../../../shared/schema/common";
import { eq, ilike } from "drizzle-orm";

export async function getUserById(id: number): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  // Try exact email first, then prefix match
  let user = await db.query.users.findFirst({
    where: eq(users.email, username.toLowerCase()),
  });

  if (!user) {
    user = await db.query.users.findFirst({
      where: ilike(users.email, `${username}%`),
    });
  }

  return user;
}

export async function createUser(data: InsertUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(
  id: number,
  data: Partial<User>
): Promise<User | undefined> {
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function getAllUsers(): Promise<User[]> {
  return db.query.users.findMany();
}

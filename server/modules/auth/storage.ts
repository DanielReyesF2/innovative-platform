import { eq } from "drizzle-orm";
import { type InsertUser, type User, users } from "../../../shared/schema/common";
import { db } from "../../db";

export async function getUserById(id: number): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
}

export async function createUser(data: InsertUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return updated;
}

export async function getAllUsers(): Promise<User[]> {
  return db.query.users.findMany();
}

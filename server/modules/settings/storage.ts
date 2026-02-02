import { db } from "../../db";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import {
  roles,
  companySettings,
  auditLog,
  moduleConfig,
  type Role,
} from "../../../shared/schema/settings";
import { users, areas, companies } from "../../../shared/schema/common";

// --- User columns (always exclude password) ---

const safeUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  companyId: users.companyId,
  areaId: users.areaId,
  isActive: users.isActive,
  lastLogin: users.lastLogin,
  createdAt: users.createdAt,
};

// --- Users ---

export async function getUsers(filters?: {
  search?: string;
  role?: string;
  areaId?: number;
  isActive?: boolean;
}) {
  const conditions = [];

  if (filters?.search) {
    conditions.push(
      or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`)
      )
    );
  }
  if (filters?.role) {
    conditions.push(eq(users.role, filters.role));
  }
  if (filters?.areaId) {
    conditions.push(eq(users.areaId, filters.areaId));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }

  const result = await db
    .select(safeUserColumns)
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt));

  return result;
}

export async function getUserStats() {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
      admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
      activeRecent: sql<number>`count(*) filter (where ${users.lastLogin} > now() - interval '7 days')::int`,
    })
    .from(users);

  return stats;
}

export async function getUserById(id: number) {
  const [user] = await db.select(safeUserColumns).from(users).where(eq(users.id, id));
  return user;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  areaId?: number | null;
  companyId?: number | null;
}) {
  const email = data.email.toLowerCase();

  // Check uniqueness
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email,
      password: hashedPassword,
      role: data.role || "viewer",
      areaId: data.areaId || null,
      companyId: data.companyId || null,
      isActive: true,
    })
    .returning();

  const { password: _, ...safeUser } = user;
  return safeUser;
}

export async function updateUser(
  id: number,
  data: {
    name?: string;
    email?: string;
    role?: string;
    areaId?: number | null;
    companyId?: number | null;
    isActive?: boolean;
  },
  currentUserId: number
) {
  // Guard: cannot change own role or deactivate self
  if (id === currentUserId) {
    if (data.role !== undefined) throw new Error("CANNOT_CHANGE_OWN_ROLE");
    if (data.isActive === false) throw new Error("CANNOT_DEACTIVATE_SELF");
  }

  // Check email uniqueness if changing email
  if (data.email) {
    const email = data.email.toLowerCase();
    const existing = await db.query.users.findFirst({
      where: and(eq(users.email, email)),
    });
    if (existing && existing.id !== id) {
      throw new Error("EMAIL_EXISTS");
    }
    data.email = email;
  }

  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  if (!updated) return null;

  const { password: _, ...safeUser } = updated;
  return safeUser;
}

export async function toggleUserActive(id: number, currentUserId: number) {
  if (id === currentUserId) throw new Error("CANNOT_DEACTIVATE_SELF");

  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) return null;

  const [updated] = await db
    .update(users)
    .set({ isActive: !user.isActive })
    .where(eq(users.id, id))
    .returning();

  const { password: _, ...safeUser } = updated;
  return safeUser;
}

export async function resetPassword(id: number, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const [updated] = await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return null;
  const { password: _, ...safeUser } = updated;
  return safeUser;
}

// --- Roles ---

export async function getRoles() {
  const allRoles = await db.query.roles.findMany({
    orderBy: [desc(roles.isSystem), roles.name],
  });

  // Count users per role
  const result = [];
  for (const role of allRoles) {
    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, role.name));
    result.push({ ...role, userCount: count.count });
  }

  return result;
}

export async function getRoleById(id: number) {
  return db.query.roles.findFirst({ where: eq(roles.id, id) });
}

export async function createRole(data: {
  name: string;
  displayName: string;
  description?: string;
  permissions?: string[];
}) {
  // Check unique name
  const existing = await db.query.roles.findFirst({
    where: eq(roles.name, data.name),
  });
  if (existing) throw new Error("ROLE_NAME_EXISTS");

  const [role] = await db
    .insert(roles)
    .values({ ...data, isSystem: false })
    .returning();
  return role;
}

export async function updateRole(
  id: number,
  data: { displayName?: string; description?: string; permissions?: string[] }
) {
  const [updated] = await db
    .update(roles)
    .set(data)
    .where(eq(roles.id, id))
    .returning();
  return updated;
}

export async function deleteRole(id: number) {
  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) return null;
  if (role.isSystem) throw new Error("CANNOT_DELETE_SYSTEM_ROLE");

  // Check if any users are using this role
  const [count] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, role.name));
  if (count.count > 0) throw new Error("ROLE_IN_USE");

  const [deleted] = await db.delete(roles).where(eq(roles.id, id)).returning();
  return deleted;
}

// --- Areas ---

export async function getAreas() {
  const allAreas = await db.query.areas.findMany({
    orderBy: [areas.name],
  });

  const result = [];
  for (const area of allAreas) {
    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.areaId, area.id));
    result.push({ ...area, userCount: count.count });
  }

  return result;
}

export async function createArea(data: { name: string; companyId?: number | null }) {
  const [area] = await db.insert(areas).values(data).returning();
  return area;
}

export async function updateArea(id: number, data: { name?: string }) {
  const [updated] = await db
    .update(areas)
    .set(data)
    .where(eq(areas.id, id))
    .returning();
  return updated;
}

export async function deleteArea(id: number) {
  const [count] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.areaId, id));
  if (count.count > 0) throw new Error("AREA_IN_USE");

  const [deleted] = await db.delete(areas).where(eq(areas.id, id)).returning();
  return deleted;
}

// --- Company ---

export async function getCompany() {
  const company = await db.query.companies.findFirst();
  if (!company) return null;

  const settings = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, company.id),
  });

  return { ...company, settings: settings || null };
}

export async function updateCompany(data: { name?: string }) {
  const company = await db.query.companies.findFirst();
  if (!company) return null;

  const [updated] = await db
    .update(companies)
    .set(data)
    .where(eq(companies.id, company.id))
    .returning();
  return updated;
}

export async function upsertCompanySettings(data: Record<string, unknown>) {
  const company = await db.query.companies.findFirst();
  if (!company) return null;

  const existing = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, company.id),
  });

  if (existing) {
    const [updated] = await db
      .update(companySettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companySettings.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(companySettings)
    .values({ companyId: company.id, ...data })
    .returning();
  return created;
}

// --- Module Config ---

export async function getModuleConfigs(moduleName: string) {
  return db.query.moduleConfig.findMany({
    where: eq(moduleConfig.moduleName, moduleName),
  });
}

export async function upsertModuleConfig(
  data: { moduleName: string; configKey: string; configValue: unknown },
  updatedById: number
) {
  const existing = await db.query.moduleConfig.findFirst({
    where: and(
      eq(moduleConfig.moduleName, data.moduleName),
      eq(moduleConfig.configKey, data.configKey)
    ),
  });

  if (existing) {
    const [updated] = await db
      .update(moduleConfig)
      .set({
        configValue: data.configValue,
        updatedById,
        updatedAt: new Date(),
      })
      .where(eq(moduleConfig.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(moduleConfig)
    .values({ ...data, updatedById })
    .returning();
  return created;
}

// --- Audit Log ---

export async function logAction(data: {
  action: string;
  entityType: string;
  entityId?: string;
  performedById: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  const [entry] = await db.insert(auditLog).values(data).returning();
  return entry;
}

export async function getAuditLog(entityType?: string) {
  const conditions = entityType ? eq(auditLog.entityType, entityType) : undefined;

  return db
    .select()
    .from(auditLog)
    .where(conditions)
    .orderBy(desc(auditLog.createdAt))
    .limit(100);
}

// --- Seed System Roles ---

let systemRolesSeeded = false;

export async function seedSystemRoles() {
  if (systemRolesSeeded) return;
  systemRolesSeeded = true;

  const systemRoles = [
    {
      name: "admin",
      displayName: "Administrador",
      description: "Acceso completo al sistema",
      permissions: ["*"],
      isSystem: true,
    },
    {
      name: "manager",
      displayName: "Gerente",
      description: "Gestion de equipo y reportes",
      permissions: ["read", "write", "manage_team", "view_reports"],
      isSystem: true,
    },
    {
      name: "viewer",
      displayName: "Visualizador",
      description: "Solo lectura",
      permissions: ["read"],
      isSystem: true,
    },
  ];

  for (const role of systemRoles) {
    await db.insert(roles).values(role).onConflictDoNothing({ target: roles.name });
  }
}

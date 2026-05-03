import { pgTable, serial, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, companies } from "./common";

// --- Roles ---

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // snake_case identifier
  displayName: text("display_name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Company Settings ---

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  logoUrl: text("logo_url"),
  brandColor: text("brand_color"),
  industry: text("industry"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  taxId: text("tax_id"),
  timezone: text("timezone").default("America/Mexico_City"),
  locale: text("locale").default("es-MX"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdIdx: index("company_settings_company_id_idx").on(table.companyId),
}));

// --- Audit Log ---

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  performedById: integer("performed_by_id").references(() => users.id),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  performedByIdx: index("audit_log_performed_by_id_idx").on(table.performedById),
  entityTypeIdx: index("audit_log_entity_type_idx").on(table.entityType),
}));

// --- Module Config ---

export const moduleConfig = pgTable("module_config", {
  id: serial("id").primaryKey(),
  moduleName: text("module_name").notNull(),
  configKey: text("config_key").notNull(),
  configValue: jsonb("config_value"),
  updatedById: integer("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Validators ---

export const insertRoleSchema = createInsertSchema(roles, {
  name: z.string().min(1).max(50).regex(/^[a-z_]+$/, "Solo minusculas y guion bajo"),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
}).omit({ id: true, createdAt: true, isSystem: true });

export const updateRoleSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(100),
  role: z.string().max(50).optional(),
  areaId: z.number().optional().nullable(),
  companyId: z.number().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  role: z.string().max(50).optional(),
  areaId: z.number().optional().nullable(),
  companyId: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100),
});

export const createAreaSchema = z.object({
  name: z.string().min(1).max(200),
  companyId: z.number().optional().nullable(),
});

export const updateAreaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const updateCompanySettingsSchema = z.object({
  logoUrl: z.string().max(500).optional().nullable(),
  brandColor: z.string().max(20).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  locale: z.string().max(10).optional().nullable(),
});

export const upsertModuleConfigSchema = z.object({
  moduleName: z.string().min(1).max(100),
  configKey: z.string().min(1).max(100),
  configValue: z.unknown(),
});

// --- Types ---

export type Role = typeof roles.$inferSelect;
export type CompanySettings = typeof companySettings.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type ModuleConfig = typeof moduleConfig.$inferSelect;

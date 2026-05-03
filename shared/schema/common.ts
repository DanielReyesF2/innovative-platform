import { pgTable, serial, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table (optional — for multi-tenant clients)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Areas/departments table
export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyId: integer("company_id").references(() => companies.id),
  moduleSlug: text("module_slug"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdIdx: index("areas_company_id_idx").on(table.companyId),
}));

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("viewer"),
  codigo: text("codigo"), // Short code for sales team (e.g. CR, AM, LM)
  companyId: integer("company_id").references(() => companies.id),
  areaId: integer("area_id").references(() => areas.id),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  companyIdIdx: index("users_company_id_idx").on(table.companyId),
  areaIdIdx: index("users_area_id_idx").on(table.areaId),
  roleIdx: index("users_role_idx").on(table.role),
}));

// Validators
export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(100),
  role: z.string().max(50).optional(),
  codigo: z.string().max(10).optional(),
}).omit({ id: true, createdAt: true, lastLogin: true });

export const insertCompanySchema = createInsertSchema(companies, {
  name: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true });

export const insertAreaSchema = createInsertSchema(areas, {
  name: z.string().min(1).max(200),
  moduleSlug: z.string().max(50).optional(),
}).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type Area = typeof areas.$inferSelect;

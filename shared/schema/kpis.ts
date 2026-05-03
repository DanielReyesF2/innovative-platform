import { pgTable, serial, text, integer, timestamp, boolean, numeric, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, areas } from "./common";

// --- Enums ---

export const kpiFrequencyEnum = pgEnum("kpi_frequency", [
  "diario",
  "semanal",
  "mensual",
  "trimestral",
  "anual",
]);

export const kpiFormulaTypeEnum = pgEnum("kpi_formula_type", [
  "manual",
  "porcentaje",
  "promedio",
  "suma",
  "conteo",
]);

export const kpiStatusEnum = pgEnum("kpi_status", [
  "activo",
  "pausado",
  "archivado",
]);

export const kpiTrendEnum = pgEnum("kpi_trend", [
  "up",
  "down",
  "stable",
]);

export const actionPlanPriorityEnum = pgEnum("action_plan_priority", [
  "alta",
  "media",
  "baja",
]);

export const actionPlanStatusEnum = pgEnum("action_plan_status", [
  "pendiente",
  "en_proceso",
  "completado",
  "cancelado",
]);

// --- Tables ---

export const kpiCategories = pgTable("kpi_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  icon: text("icon"),
  color: text("color"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kpis = pgTable("kpis", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => kpiCategories.id),
  unit: text("unit"),
  targetValue: numeric("target_value", { precision: 12, scale: 2 }),
  minValue: numeric("min_value", { precision: 12, scale: 2 }),
  maxValue: numeric("max_value", { precision: 12, scale: 2 }),
  frequency: kpiFrequencyEnum("frequency").notNull().default("mensual"),
  formulaType: kpiFormulaTypeEnum("formula_type").notNull().default("manual"),
  ownerId: integer("owner_id").references(() => users.id),
  areaId: integer("area_id").references(() => areas.id),
  dataSource: text("data_source"),
  status: kpiStatusEnum("status").notNull().default("activo"),
  displayOrder: integer("display_order").default(0),
  color: text("color"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdIdx: index("kpis_category_id_idx").on(table.categoryId),
  ownerIdIdx: index("kpis_owner_id_idx").on(table.ownerId),
  areaIdIdx: index("kpis_area_id_idx").on(table.areaId),
}));

export const kpiEntries = pgTable("kpi_entries", {
  id: serial("id").primaryKey(),
  kpiId: integer("kpi_id").references(() => kpis.id).notNull(),
  period: text("period").notNull(), // YYYY-MM or YYYY-MM-DD
  actualValue: numeric("actual_value", { precision: 12, scale: 2 }).notNull(),
  targetValue: numeric("target_value", { precision: 12, scale: 2 }),
  previousValue: numeric("previous_value", { precision: 12, scale: 2 }),
  compliance: numeric("compliance", { precision: 7, scale: 2 }),
  trend: kpiTrendEnum("trend"),
  notes: text("notes"),
  recordedById: integer("recorded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  kpiIdIdx: index("kpi_entries_kpi_id_idx").on(table.kpiId),
}));

export const kpiActionPlans = pgTable("kpi_action_plans", {
  id: serial("id").primaryKey(),
  kpiId: integer("kpi_id").references(() => kpis.id).notNull(),
  kpiEntryId: integer("kpi_entry_id").references(() => kpiEntries.id),
  title: text("title").notNull(),
  description: text("description"),
  responsibleId: integer("responsible_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: actionPlanPriorityEnum("priority").notNull().default("media"),
  status: actionPlanStatusEnum("status").notNull().default("pendiente"),
  completedDate: timestamp("completed_date"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  kpiIdIdx: index("kpi_action_plans_kpi_id_idx").on(table.kpiId),
  responsibleIdIdx: index("kpi_action_plans_responsible_id_idx").on(table.responsibleId),
}));

// --- Validators ---

export const insertKpiCategorySchema = createInsertSchema(kpiCategories, {
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
}).omit({ id: true, createdAt: true, isSystem: true });

export const insertKpiSchema = createInsertSchema(kpis, {
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  unit: z.string().max(50).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateKpiSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  categoryId: z.number().optional(),
  unit: z.string().max(50).optional(),
  targetValue: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  frequency: z.enum(["diario", "semanal", "mensual", "trimestral", "anual"]).optional(),
  formulaType: z.enum(["manual", "porcentaje", "promedio", "suma", "conteo"]).optional(),
  ownerId: z.number().optional().nullable(),
  areaId: z.number().optional().nullable(),
  dataSource: z.string().optional(),
  status: z.enum(["activo", "pausado", "archivado"]).optional(),
  displayOrder: z.number().optional(),
  color: z.string().optional(),
});

export const insertKpiEntrySchema = z.object({
  kpiId: z.number(),
  period: z.string().min(4).max(10),
  actualValue: z.string(),
  notes: z.string().max(500).optional(),
});

export const updateKpiEntrySchema = z.object({
  actualValue: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const insertActionPlanSchema = z.object({
  kpiId: z.number(),
  kpiEntryId: z.number().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  responsibleId: z.number().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["alta", "media", "baja"]).optional(),
});

export const updateActionPlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  responsibleId: z.number().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["alta", "media", "baja"]).optional(),
  status: z.enum(["pendiente", "en_proceso", "completado", "cancelado"]).optional(),
});

// --- Types ---

export type KpiCategory = typeof kpiCategories.$inferSelect;
export type Kpi = typeof kpis.$inferSelect;
export type KpiEntry = typeof kpiEntries.$inferSelect;
export type KpiActionPlan = typeof kpiActionPlans.$inferSelect;

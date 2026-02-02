import { pgTable, serial, text, integer, timestamp, boolean, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./common";

// Enums
export const prospectStageEnum = pgEnum("prospect_stage", [
  "lead",
  "levantamiento",
  "propuesta",
  "negociacion",
  "cierre",
  "rechazada",
]);

export const priorityEnum = pgEnum("priority_level", [
  "muy_alta",
  "alta",
  "media",
  "baja",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "referido",
  "web",
  "linkedin",
  "evento",
  "cold_call",
  "otro",
]);

// Rejection reasons catalog
export const rejectionReasons = pgTable("rejection_reasons", {
  id: serial("id").primaryKey(),
  reason: text("reason").notNull(),
  category: text("category").notNull(), // Comercial, Proceso, Operativo, Competencia, Legal, Viabilidad
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prospects (main CRM entity)
export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  location: text("location").notNull(),
  potential: text("potential").notNull(), // Bajo, Medio, Alto, Muy Alto
  estimatedVolume: text("estimated_volume"), // e.g. "120 ton/mes"
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  probability: integer("probability").default(0), // 0-100
  stage: prospectStageEnum("stage").notNull().default("lead"),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  lastActivity: text("last_activity"),
  priority: priorityEnum("priority").default("media"),
  reason: text("reason"), // why they're interested
  nextStep: text("next_step"),
  estimatedCloseTime: text("estimated_close_time"),
  risk: text("risk"),
  opportunity: text("opportunity"),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  rejectionReasonId: integer("rejection_reason_id").references(() => rejectionReasons.id),
  rejectionDetail: text("rejection_detail"),
  rejectionDate: timestamp("rejection_date"),
  proposalDate: timestamp("proposal_date"),
  // Handoff to operaciones
  surveyId: integer("survey_id"),
  levantamientoData: jsonb("levantamiento_data"),
  sentToOpsAt: timestamp("sent_to_ops_at"),
  sentToOpsById: integer("sent_to_ops_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads (incoming opportunities not yet qualified)
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactRole: text("contact_role"),
  source: leadSourceEnum("source").notNull().default("web"),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  industry: text("industry"),
  location: text("location"),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  convertedToProspectId: integer("converted_to_prospect_id").references(() => prospects.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pipeline stages summary (for fast dashboard queries)
export const pipelineSnapshots = pgTable("pipeline_snapshots", {
  id: serial("id").primaryKey(),
  stage: text("stage").notNull(),
  count: integer("count").notNull().default(0),
  totalValue: numeric("total_value", { precision: 14, scale: 2 }).default("0"),
  target: integer("target").default(0),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
});

// Sales team members (extends users with commercial metrics)
export const salesMetrics = pgTable("sales_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  period: text("period").notNull(), // e.g. "2025-11"
  leads: integer("leads").default(0),
  surveys: integer("surveys").default(0),
  proposalsSent: integer("proposals_sent").default(0),
  meetings: integer("meetings").default(0),
  closedDeals: integer("closed_deals").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }),
  monthlyBudget: numeric("monthly_budget", { precision: 12, scale: 2 }),
  actualSales: numeric("actual_sales", { precision: 12, scale: 2 }),
  budgetCompliance: numeric("budget_compliance", { precision: 5, scale: 2 }),
  responseTime: text("response_time"),
  clientSatisfaction: numeric("client_satisfaction", { precision: 3, scale: 1 }),
  weeklyActivities: integer("weekly_activities").default(0),
  globalEfficiency: numeric("global_efficiency", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validators
export const insertProspectSchema = createInsertSchema(prospects, {
  name: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  potential: z.string().min(1).max(20),
  probability: z.number().min(0).max(100).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertLeadSchema = createInsertSchema(leads, {
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true });

export const insertRejectionReasonSchema = createInsertSchema(rejectionReasons, {
  reason: z.string().min(1).max(300),
  category: z.string().min(1).max(50),
}).omit({ id: true, createdAt: true });

export const insertSalesMetricsSchema = createInsertSchema(salesMetrics).omit({
  id: true,
  createdAt: true,
});

// Types
export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type RejectionReason = typeof rejectionReasons.$inferSelect;
export type SalesMetrics = typeof salesMetrics.$inferSelect;
export type PipelineSnapshot = typeof pipelineSnapshots.$inferSelect;

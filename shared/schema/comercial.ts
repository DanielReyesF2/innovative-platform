import { pgTable, serial, text, integer, timestamp, boolean, numeric, jsonb, pgEnum, uniqueIndex, date, bigint, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./common";

// Enums
export const prospectStageEnum = pgEnum("prospect_stage", [
  // Order MUST match DB exactly (ALTER TYPE ADD VALUE appends at end)
  "lead",
  "prospecto",
  "levantamiento",
  "propuesta",
  "negociacion",
  "cierre",
  "rechazada",
  "contacto_inicial",
  "presentacion",
  "cierre_ganado",
  "cierre_perdido",
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

// New enums for CRM enhancements
export const activityTypeEnum = pgEnum("activity_type", [
  "llamada",
  "email",
  "reunion",
  "nota",
  "cambio_etapa",
  "documento",
  "propuesta",
  "otro",
]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "programada",
  "completada",
  "cancelada",
  "reprogramada",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "borrador",
  "enviada",
  "revisada",
  "aceptada",
  "rechazada",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "pending",
  "acknowledged",
  "dismissed",
  "auto_resolved",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "overdue_follow_up",
  "stale_prospect",
  "high_value_at_risk",
  "scheduled_reminder",
  // SLA de 3 días hábiles para subir propuesta después de agendar el levantamiento.
  "proposal_deadline_pending",
  "proposal_deadline_overdue",
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
  industry: text("industry"),
  location: text("location"),
  potential: text("potential"), // Bajo, Medio, Alto, Muy Alto
  estimatedVolume: text("estimated_volume"), // e.g. "120 ton/mes" (total/summary)
  services: text("services").array().default([]),  // selected services (e.g. ["rme", "biodigestores"])
  serviceVolumes: jsonb("service_volumes").$type<Record<string, string>>().default({}), // e.g. { "rme": "80 ton/mes", "organicos": "40 ton/mes" }
  // DEBT: if volume aggregation/reports needed, migrate to { volume, unit } structure
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  probability: integer("probability").default(0), // 0-100
  stage: prospectStageEnum("stage").notNull().default("contacto_inicial"),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  source: leadSourceEnum("source").default("otro"),
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
  // CRM enhancements
  lastContactAt: timestamp("last_contact_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  competitors: text("competitors").array(),
  // Rejected prospects: follow-up tracking
  fechaVencimientoContrato: timestamp("fecha_vencimiento_contrato"),
  followUpAction: text("follow_up_action"),
  recoveryStatus: text("recovery_status"), // sin_seguimiento, en_seguimiento, re_contactada
  firstContactDate: date("first_contact_date"), // business date: when initial contact happened
  meetingDate: date("meeting_date"), // when the meeting is scheduled
  surveyDate: date("survey_date"), // when the levantamiento is scheduled
  // SLA: set when agendamiento de levantamiento is complete and prospect
  // auto-advances to "Propuesta" (DB stage=negociacion). End of business day
  // at surveyDate + 3 business days. Cleared once proposalDate is recorded.
  proposalDeadline: timestamp("proposal_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads (incoming opportunities not yet qualified)
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  contactRole: text("contact_role"),
  source: leadSourceEnum("source").notNull().default("web"),
  notes: text("notes"),
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

// === CRM ENHANCEMENT TABLES ===

// Prospect Activities (Timeline)
export const prospectActivities = pgTable("prospect_activities", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id).notNull(),
  type: activityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  activityDate: timestamp("activity_date"),  // when the activity happened (business date)
  metadata: jsonb("metadata"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prospect Notes
export const prospectNotes = pgTable("prospect_notes", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id).notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prospect Meetings
export const prospectMeetings = pgTable("prospect_meetings", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60),
  location: text("location"),
  meetingUrl: text("meeting_url"),
  status: meetingStatusEnum("status").default("programada"),
  attendees: jsonb("attendees"),
  outcome: text("outcome"),
  completedAt: timestamp("completed_at"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prospect Documents
export const prospectDocuments = pgTable("prospect_documents", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // contrato, cotizacion, presentacion, otro
  url: text("url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  description: text("description"),
  uploadedById: integer("uploaded_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Proposal Versions
export const proposalVersions = pgTable("proposal_versions", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id).notNull(),
  version: integer("version").notNull().default(1),
  name: text("name").notNull(),
  url: text("url").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  validUntil: timestamp("valid_until"),
  status: proposalStatusEnum("status").default("borrador"),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  sentById: integer("sent_by_id").references(() => users.id),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stage Transitions (audit log of prospect stage changes — for lapso metrics)
// Populated on every change of prospects.stage. Purely additive; no field
// drives UI state today, but dashboards query this to show time-in-stage.
export const stageTransitions = pgTable("stage_transitions", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id).notNull(),
  fromStage: text("from_stage"), // null only for prospects migrated without prior state
  toStage: text("to_stage").notNull(),
  changedById: integer("changed_by_id").references(() => users.id), // null for system-driven transitions
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  durationInPrevStageMs: bigint("duration_in_prev_stage_ms", { mode: "number" }), // null on first transition (no prior stage)
  notes: text("notes"),
}, (table) => ({
  byProspect: index("stage_transitions_prospect_idx").on(table.prospectId, table.changedAt),
}));

// Follow-up Alerts
export const followUpAlerts = pgTable("follow_up_alerts", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").references(() => prospects.id),
  alertType: alertTypeEnum("alert_type").notNull(),
  status: alertStatusEnum("status").default("pending"),
  title: text("title").notNull(),
  message: text("message"),
  priority: priorityEnum("priority").default("media"),
  dueDate: timestamp("due_date"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedById: integer("acknowledged_by_id").references(() => users.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validators
export const insertProspectSchema = createInsertSchema(prospects, {
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  potential: z.string().max(20).optional(),
  probability: z.number().min(0).max(100).optional(),
  services: z.array(z.string().max(50)).max(10).optional(),
  serviceVolumes: z.record(z.string().max(50), z.string().max(100)).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const qualifyProspectSchema = z.object({
  industry: z.string().min(1).max(100),
  potential: z.string().min(1).max(20),
  estimatedValue: z.union([z.string(), z.number()]).optional(),
  estimatedVolume: z.string().max(100).optional(),
  probability: z.number().min(0).max(100),
  priority: z.enum(["muy_alta", "alta", "media", "baja"]),
  contactRole: z.string().max(200).optional(),
  contactEmail: z.string().email().max(200).optional(),
  reason: z.string().max(500).optional(),
  nextStep: z.string().max(500).optional(),
});

export const insertLeadSchema = createInsertSchema(leads, {
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(200).optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
}).omit({ id: true, createdAt: true });

export const insertRejectionReasonSchema = createInsertSchema(rejectionReasons, {
  reason: z.string().min(1).max(300),
  category: z.string().min(1).max(50),
}).omit({ id: true, createdAt: true });

export const insertSalesMetricsSchema = createInsertSchema(salesMetrics).omit({
  id: true,
  createdAt: true,
});

// Validators for new tables
export const insertActivitySchema = createInsertSchema(prospectActivities, {
  title: z.string().min(1).max(200),
  activityDate: z.date().optional(),
}).omit({ id: true, createdAt: true });

export const insertNoteSchema = createInsertSchema(prospectNotes, {
  content: z.string().min(1).max(5000),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertMeetingSchema = createInsertSchema(prospectMeetings, {
  title: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertProspectDocumentSchema = createInsertSchema(prospectDocuments, {
  name: z.string().min(1).max(200),
  url: z.string().url().max(500),
}).omit({ id: true, createdAt: true });

export const insertProposalSchema = createInsertSchema(proposalVersions, {
  name: z.string().min(1).max(200),
  url: z.string().url().max(500),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertAlertSchema = createInsertSchema(followUpAlerts, {
  title: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true });

// === POST-REUNION VERO TABLES (Feb 2026) ===

// Ventas Reales por Ejecutivo (monthly actual sales)
export const ventasReales = pgTable("ventas_reales", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  mes: integer("mes").notNull(), // 1-12
  año: integer("año").notNull(),
  monto: numeric("monto", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserMesAño: uniqueIndex("ventas_reales_user_mes_año_idx").on(table.userId, table.mes, table.año),
}));

// KPIs Mensuales (historical data structure for year-over-year comparisons)
export const kpisMensuales = pgTable("kpis_mensuales", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  año: integer("año").notNull(),
  mes: integer("mes").notNull(), // 1-12
  leads: integer("leads").default(0),
  prospectos: integer("prospectos").default(0),
  reuniones: integer("reuniones").default(0),
  levantamientos: integer("levantamientos").default(0),
  propuestas: integer("propuestas").default(0),
  cierres: integer("cierres").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validators for new tables
export const insertVentaRealSchema = createInsertSchema(ventasReales, {
  mes: z.number().min(1).max(12),
  año: z.number().min(2020).max(2100),
  monto: z.string().or(z.number()),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertKpiMensualSchema = createInsertSchema(kpisMensuales, {
  mes: z.number().min(1).max(12),
  año: z.number().min(2020).max(2100),
}).omit({ id: true, createdAt: true });

// Types
export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type RejectionReason = typeof rejectionReasons.$inferSelect;
export type SalesMetrics = typeof salesMetrics.$inferSelect;
export type PipelineSnapshot = typeof pipelineSnapshots.$inferSelect;
export type QualifyProspectData = z.infer<typeof qualifyProspectSchema>;

// New types
export type ProspectActivity = typeof prospectActivities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ProspectNote = typeof prospectNotes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type ProspectMeeting = typeof prospectMeetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type ProspectDocument = typeof prospectDocuments.$inferSelect;
export type InsertProspectDocument = z.infer<typeof insertProspectDocumentSchema>;
export type ProposalVersion = typeof proposalVersions.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type FollowUpAlert = typeof followUpAlerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type StageTransition = typeof stageTransitions.$inferSelect;

// === RESUMEN SEMANAL (Weekly Management Report) ===

export const comercialWeeklyReports = pgTable("comercial_weekly_reports", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  content: text("content").notNull().default(""),
  meetingNotes: text("meeting_notes").default(""),
  status: text("status").notNull().default("draft"), // 'draft' | 'sent'
  sentAt: timestamp("sent_at"),
  recipients: text("recipients"), // comma-separated emails
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueWeekUser: uniqueIndex("comercial_weekly_reports_week_user_idx").on(table.weekStart, table.createdById),
}));

export const insertWeeklyReportSchema = createInsertSchema(comercialWeeklyReports, {
  content: z.string().max(50000),
  meetingNotes: z.string().max(50000).optional(),
  recipients: z.string().max(1000).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true });

// === COMPROMISOS SEMANALES ===

export const weeklyCommitments = pgTable("weekly_commitments", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull(),
  description: text("description").notNull(),
  responsible: text("responsible").notNull(),
  responsibleUserId: integer("responsible_user_id").references(() => users.id),
  dueDate: date("due_date"),
  status: text("status").notNull().default("pendiente"), // 'pendiente' | 'cumplido'
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeeklyCommitmentSchema = createInsertSchema(weeklyCommitments, {
  description: z.string().min(1).max(500),
  responsible: z.string().min(1).max(100),
  responsibleUserId: z.number().int().positive().optional(),
  status: z.enum(["pendiente", "cumplido"]).default("pendiente"),
}).omit({ id: true, createdAt: true });

// Post-reunion types
export type VentaReal = typeof ventasReales.$inferSelect;
export type InsertVentaReal = z.infer<typeof insertVentaRealSchema>;
export type KpiMensual = typeof kpisMensuales.$inferSelect;
export type InsertKpiMensual = z.infer<typeof insertKpiMensualSchema>;

// Weekly report types
export type ComercialWeeklyReport = typeof comercialWeeklyReports.$inferSelect;
export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;
export type WeeklyCommitment = typeof weeklyCommitments.$inferSelect;
export type InsertWeeklyCommitment = z.infer<typeof insertWeeklyCommitmentSchema>;

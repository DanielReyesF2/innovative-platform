import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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

export const priorityEnum = pgEnum("priority_level", ["muy_alta", "alta", "media", "baja"]);

export const leadSourceEnum = pgEnum("lead_source", ["referido", "web", "linkedin", "evento", "cold_call", "otro"]);

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

export const meetingStatusEnum = pgEnum("meeting_status", ["programada", "completada", "cancelada", "reprogramada"]);

// Modalidad de una reunión — requerido por el spec de Vero en etapa Reunión.
export const meetingTypeEnum = pgEnum("meeting_type", ["virtual", "presencial"]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "borrador",
  "enviada",
  "revisada",
  "aceptada",
  "rechazada",
]);

export const alertStatusEnum = pgEnum("alert_status", ["pending", "acknowledged", "dismissed", "auto_resolved"]);

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
export const prospects = pgTable(
  "prospects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    industry: text("industry"),
    location: text("location"),
    potential: text("potential"), // Bajo, Medio, Alto, Muy Alto
    estimatedVolume: text("estimated_volume"), // e.g. "120 ton/mes" (total/summary)
    services: text("services").array().default([]), // selected services (e.g. ["rme", "biodigestores"])
    serviceVolumes: jsonb("service_volumes").$type<Record<string, string>>().default({}), // e.g. { "rme": "80 ton/mes", "organicos": "40 ton/mes" }
    // DEBT: if volume aggregation/reports needed, migrate to { volume, unit } structure
    estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
    probability: integer("probability").default(0), // 0-100
    stage: prospectStageEnum("stage").notNull().default("contacto_inicial"),
    contactName: text("contact_name"),
    contactRole: text("contact_role"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    // Frecuencia con la que el cliente requeriría el servicio (opcional, se
    // captura al calificar Lead → Prospecto).
    serviceFrequency: text("service_frequency"),
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
    // Fecha estimada de inicio de operaciones — se captura al mandar la
    // propuesta (spec Vero). Distinta de operationsStartDate que es la fecha
    // real ya cerrada.
    estimatedStartDate: date("estimated_start_date"),
    // Socio Ambiental (Fase 2 bloque 4 — spec Vero).
    // Se captura una vez que el prospecto se cierra ganado. Los campos de
    // contrato / tiempo / días de crédito viven aquí por ahora; más adelante
    // se van a sincronizar con el futuro módulo "Socios Ambientales" cuando
    // exista.
    closeDate: timestamp("close_date"),
    operationsStartDate: date("operations_start_date"),
    hasContract: boolean("has_contract").default(false),
    contractDurationMonths: integer("contract_duration_months"),
    paymentTermsServices: integer("payment_terms_services"), // días
    paymentTermsValuables: integer("payment_terms_valuables"), // días
    // Venta Real: lo que realmente se facturó de este prospecto (puede diferir
    // de estimatedValue/cotización). Se suma por mes en la gráfica de presupuesto.
    actualRevenue: numeric("actual_revenue", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    assignedToIdx: index("prospects_assigned_to_id_idx").on(table.assignedToId),
    stageIdx: index("prospects_stage_idx").on(table.stage),
    rejectionReasonIdx: index("prospects_rejection_reason_id_idx").on(table.rejectionReasonId),
    surveyIdx: index("prospects_survey_id_idx").on(table.surveyId),
  }),
);

// Leads (incoming opportunities not yet qualified)
export const leads = pgTable(
  "leads",
  {
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
  },
  (table) => ({
    assignedToIdx: index("leads_assigned_to_id_idx").on(table.assignedToId),
  }),
);

// Sales team members (extends users with commercial metrics)
export const salesMetrics = pgTable(
  "sales_metrics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
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
  },
  (table) => ({
    userIdIdx: index("sales_metrics_user_id_idx").on(table.userId),
    userPeriodUnique: uniqueIndex("sales_metrics_user_period_idx").on(table.userId, table.period),
  }),
);

// === CRM ENHANCEMENT TABLES ===

// Prospect Activities (Timeline)
export const prospectActivities = pgTable(
  "prospect_activities",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .references(() => prospects.id)
      .notNull(),
    type: activityTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    activityDate: timestamp("activity_date"), // when the activity happened (business date)
    metadata: jsonb("metadata"),
    createdById: integer("created_by_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    prospectIdIdx: index("prospect_activities_prospect_id_idx").on(table.prospectId),
  }),
);

// Prospect Notes
export const prospectNotes = pgTable(
  "prospect_notes",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .references(() => prospects.id)
      .notNull(),
    content: text("content").notNull(),
    isPinned: boolean("is_pinned").default(false),
    createdById: integer("created_by_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    prospectIdIdx: index("prospect_notes_prospect_id_idx").on(table.prospectId),
  }),
);

// Prospect Meetings
export const prospectMeetings = pgTable(
  "prospect_meetings",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .references(() => prospects.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    duration: integer("duration").default(60),
    location: text("location"),
    meetingUrl: text("meeting_url"),
    status: meetingStatusEnum("status").default("programada"),
    // Modalidad de la reunión — requerido en etapa Reunión por el flujo de Vero.
    meetingType: meetingTypeEnum("meeting_type"),
    // Objetivo de la reunión — dimensionar oportunidad, validar levantamiento, etc.
    objective: text("objective"),
    // attendees: JSONB con forma [{ side: 'prospect'|'innovative', name, role }]
    // para que la UI pueda separar asistentes del cliente vs de Innovative con su
    // cargo. Se sigue aceptando formato legacy (array de strings).
    attendees: jsonb("attendees"),
    outcome: text("outcome"),
    completedAt: timestamp("completed_at"),
    createdById: integer("created_by_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    prospectIdIdx: index("prospect_meetings_prospect_id_idx").on(table.prospectId),
  }),
);

// Prospect Documents
export const prospectDocuments = pgTable(
  "prospect_documents",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .references(() => prospects.id)
      .notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(), // contrato, cotizacion, presentacion, otro
    url: text("url").notNull(),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    description: text("description"),
    uploadedById: integer("uploaded_by_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    prospectIdIdx: index("prospect_documents_prospect_id_idx").on(table.prospectId),
  }),
);

// Proposal Versions
export const proposalVersions = pgTable(
  "proposal_versions",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .references(() => prospects.id)
      .notNull(),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    url: text("url").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    // Margen de utilidad (%) — campo obligatorio del spec de Vero en Propuesta.
    utilidad: numeric("utilidad", { precision: 5, scale: 2 }),
    // Contacto receptor de la propuesta (nombre + cargo) — también del spec.
    recipientName: text("recipient_name"),
    recipientRole: text("recipient_role"),
    validUntil: timestamp("valid_until"),
    status: proposalStatusEnum("status").default("borrador"),
    notes: text("notes"),
    sentAt: timestamp("sent_at"),
    sentById: integer("sent_by_id").references(() => users.id),
    createdById: integer("created_by_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    prospectIdIdx: index("proposal_versions_prospect_id_idx").on(table.prospectId),
  }),
);

// Stage Transitions (audit log of prospect stage changes — for lapso metrics)
// Populated on every change of prospects.stage. Purely additive; no field
// drives UI state today, but dashboards query this to show time-in-stage.
export const stageTransitions = pgTable(
  "stage_transitions",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id")
      .references(() => prospects.id)
      .notNull(),
    fromStage: text("from_stage"), // null only for prospects migrated without prior state
    toStage: text("to_stage").notNull(),
    changedById: integer("changed_by_id").references(() => users.id), // null for system-driven transitions
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    durationInPrevStageMs: bigint("duration_in_prev_stage_ms", { mode: "number" }), // null on first transition (no prior stage)
    notes: text("notes"),
  },
  (table) => ({
    byProspect: index("stage_transitions_prospect_idx").on(table.prospectId, table.changedAt),
  }),
);

// Follow-up Alerts
export const followUpAlerts = pgTable(
  "follow_up_alerts",
  {
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
  },
  (table) => ({
    prospectIdIdx: index("follow_up_alerts_prospect_id_idx").on(table.prospectId),
    statusIdx: index("follow_up_alerts_status_idx").on(table.status),
  }),
);

// --- JSONB Zod schemas ---

export const meetingAttendeeSchema = z.object({
  side: z.enum(["prospect", "innovative"]),
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
});

export const attendeesSchema = z.array(meetingAttendeeSchema).max(20);

export const activityMetadataSchema = z.record(z.string(), z.unknown()).optional();

export const levantamientoDataSchema = z
  .object({
    generalInfo: z
      .object({
        razonSocial: z.string().max(300).optional(),
        direccion: z.string().max(500).optional(),
      })
      .passthrough()
      .optional(),
    wasteTypes: z
      .array(
        z
          .object({
            wasteType: z.string().min(1),
          })
          .passthrough(),
      )
      .optional(),
    scheduling: z
      .object({
        siteAddress: z.string().max(500).optional(),
        proposedDate: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

// Validators
export const insertProspectSchema = createInsertSchema(prospects, {
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  potential: z.string().max(20).optional(),
  probability: z.number().min(0).max(100).optional(),
  services: z.array(z.string().max(50)).max(10).optional(),
  serviceVolumes: z.record(z.string().max(50), z.string().max(100)).optional(),
  levantamientoData: levantamientoDataSchema,
  // Timestamps editables: drizzle-zod genera z.date() para timestamp() sin
  // mode:"string", pero el frontend envía ISO strings. z.coerce.date()
  // acepta ambos formatos y produce Date (lo que Drizzle espera).
  closeDate: z.coerce.date().nullable().optional(),
  rejectionDate: z.coerce.date().nullable().optional(),
  proposalDate: z.coerce.date().nullable().optional(),
  sentToOpsAt: z.coerce.date().nullable().optional(),
  lastContactAt: z.coerce.date().nullable().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  fechaVencimientoContrato: z.coerce.date().nullable().optional(),
  proposalDeadline: z.coerce.date().nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Per Vero's flow (Prospecto stage): only contact data is required at this
// step. Industria is captured in Lead; potencial / valor cotización /
// residuos / volumen aparecen en etapas posteriores. serviceFrequency es
// opcional.
export const qualifyProspectSchema = z.object({
  contactRole: z.string().min(1, "Cargo requerido").max(200),
  contactPhone: z.string().min(1, "Teléfono requerido").max(50),
  contactEmail: z.string().email("Correo inválido").max(200),
  location: z.string().min(1, "Ubicación requerida").max(200),
  serviceFrequency: z.string().max(100).optional(),
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
  metadata: activityMetadataSchema,
}).omit({ id: true, createdAt: true });

export const insertNoteSchema = createInsertSchema(prospectNotes, {
  content: z.string().min(1).max(5000),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertMeetingSchema = createInsertSchema(prospectMeetings, {
  title: z.string().min(1).max(200),
  attendees: attendeesSchema.optional(),
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
export const ventasReales = pgTable(
  "ventas_reales",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    mes: integer("mes").notNull(), // 1-12
    año: integer("año").notNull(),
    monto: numeric("monto", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueUserMesAño: uniqueIndex("ventas_reales_user_mes_año_idx").on(table.userId, table.mes, table.año),
  }),
);

// KPIs Mensuales (historical data structure for year-over-year comparisons)
export const kpisMensuales = pgTable(
  "kpis_mensuales",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    año: integer("año").notNull(),
    mes: integer("mes").notNull(), // 1-12
    leads: integer("leads").default(0),
    prospectos: integer("prospectos").default(0),
    reuniones: integer("reuniones").default(0),
    levantamientos: integer("levantamientos").default(0),
    propuestas: integer("propuestas").default(0),
    cierres: integer("cierres").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("kpis_mensuales_user_id_idx").on(table.userId),
  }),
);

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

export const comercialWeeklyReports = pgTable(
  "comercial_weekly_reports",
  {
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
  },
  (table) => ({
    uniqueWeekUser: uniqueIndex("comercial_weekly_reports_week_user_idx").on(table.weekStart, table.createdById),
  }),
);

export const insertWeeklyReportSchema = createInsertSchema(comercialWeeklyReports, {
  content: z.string().max(50000),
  meetingNotes: z.string().max(50000).optional(),
  recipients: z.string().max(1000).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true });

// === COMPROMISOS SEMANALES ===

export const weeklyCommitments = pgTable(
  "weekly_commitments",
  {
    id: serial("id").primaryKey(),
    weekStart: date("week_start").notNull(),
    description: text("description").notNull(),
    responsible: text("responsible").notNull(),
    responsibleUserId: integer("responsible_user_id").references(() => users.id),
    dueDate: date("due_date"),
    status: text("status").notNull().default("pendiente"), // 'pendiente' | 'cumplido'
    createdById: integer("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    responsibleUserIdx: index("weekly_commitments_responsible_user_id_idx").on(table.responsibleUserId),
  }),
);

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

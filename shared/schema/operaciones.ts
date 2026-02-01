import { pgTable, serial, text, integer, timestamp, boolean, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./common";

// Enums
export const surveyStatusEnum = pgEnum("survey_status", [
  "agendado",
  "en_proceso",
  "completado",
  "cancelado",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "vigente",
  "por_vencer",
  "vencido",
]);

// Surveys (Levantamientos)
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  status: surveyStatusEnum("status").notNull().default("agendado"),
  type: text("type").notNull().default("Levantamiento"), // Levantamiento or Propuesta
  estimatedVolume: text("estimated_volume"),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  nextStep: text("next_step"),
  hasReport: boolean("has_report").default(false),
  // General info stored as JSON for flexibility
  generalInfo: jsonb("general_info"), // razonSocial, rfc, direccion, contacto, etc.
  observations: text("observations"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Survey waste types (detailed waste analysis per survey)
export const surveyWasteTypes = pgTable("survey_waste_types", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  wasteType: text("waste_type").notNull(), // Orgánicos, Cartón, Plástico, etc.
  quantity: text("quantity"), // e.g. "18 ton/mes"
  percentage: integer("percentage"),
  currentDestination: text("current_destination"),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }),
});

// Survey current services (existing provider info)
export const surveyCurrentServices = pgTable("survey_current_services", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  providerName: text("provider_name"),
  contractActive: boolean("contract_active").default(false),
  contractStart: timestamp("contract_start"),
  contractEnd: timestamp("contract_end"),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }),
  collectionFrequency: text("collection_frequency"),
  serviceType: text("service_type"),
  includesSeparation: boolean("includes_separation").default(false),
  includesValorization: boolean("includes_valorization").default(false),
  includesReporting: boolean("includes_reporting").default(false),
  satisfactionLevel: integer("satisfaction_level"), // 1-10
  reasonForChange: text("reason_for_change"),
});

// Survey infrastructure
export const surveyInfrastructure = pgTable("survey_infrastructure", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  hasStorageArea: boolean("has_storage_area").default(false),
  storageAreaSize: text("storage_area_size"),
  storageType: text("storage_type"),
  containerCount: integer("container_count"),
  hasCompactor: boolean("has_compactor").default(false),
  hasWarehouse: boolean("has_warehouse").default(false),
  vehicleAccess: text("vehicle_access"),
  scheduleRestrictions: text("schedule_restrictions"),
  availableSpace: text("available_space"),
});

// Survey needs/requirements
export const surveyNeeds = pgTable("survey_needs", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  needsSeparation: boolean("needs_separation").default(false),
  needsValorization: boolean("needs_valorization").default(false),
  needsTraceability: boolean("needs_traceability").default(false),
  needsMonthlyReporting: boolean("needs_monthly_reporting").default(false),
  certifications: jsonb("certifications"), // string[]
  environmentalGoals: text("environmental_goals"),
  availableBudget: numeric("available_budget", { precision: 10, scale: 2 }),
  urgency: text("urgency"), // Baja, Media, Alta
  decisionMaker: text("decision_maker"),
});

// Operational documents (permisos, licencias, certificados)
export const operationalDocuments = pgTable("operational_documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Permiso Ambiental, Licencia, Certificado ISO, etc.
  category: text("category").notNull(), // Licencias, Permisos, Certificaciones, Seguros
  issueDate: timestamp("issue_date"),
  expirationDate: timestamp("expiration_date"),
  fileName: text("file_name"),
  status: documentStatusEnum("status").notNull().default("vigente"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Validators
export const insertSurveySchema = createInsertSchema(surveys, {
  clientName: z.string().min(1).max(200),
  type: z.string().min(1).max(50),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSurveyWasteTypeSchema = createInsertSchema(surveyWasteTypes, {
  wasteType: z.string().min(1).max(100),
}).omit({ id: true });

export const insertDocumentSchema = createInsertSchema(operationalDocuments, {
  name: z.string().min(1).max(300),
  type: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type SurveyWasteType = typeof surveyWasteTypes.$inferSelect;
export type OperationalDocument = typeof operationalDocuments.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

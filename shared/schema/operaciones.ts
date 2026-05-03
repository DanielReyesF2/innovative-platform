import { pgTable, serial, text, integer, timestamp, boolean, numeric, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./common";
import { prospects } from "./comercial";

// ─── Enums ───────────────────────────────────────────────

export const surveyStatusEnum = pgEnum("survey_status", [
  // Order MUST match DB exactly (original values first, then added ones)
  "pendiente_revision",
  "agendado",
  "en_proceso",
  "completado",
  "cancelado",
  "rechazado",
  "borrador_comercial",
  "pendiente_operaciones",
  "en_sitio",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "vigente",
  "por_vencer",
  "vencido",
]);

// ─── Zod schemas for JSONB columns ──────────────────────

export const installationsSchema = z.object({
  lighting: z.boolean().nullable().optional(),
  lightingObs: z.string().nullable().optional(),
  electricalOutlets: z.boolean().nullable().optional(),
  electricalObs: z.string().nullable().optional(),
  voltages: z.array(z.string()).nullable().optional(), // ["110V", "220V", "440V"]
  ventilation: z.boolean().nullable().optional(),
  ventilationObs: z.string().nullable().optional(),
  drainage: z.boolean().nullable().optional(),
  drainageObs: z.string().nullable().optional(),
  waterSupply: z.boolean().nullable().optional(),
  waterSupplyObs: z.string().nullable().optional(),
  loadingDock: z.boolean().nullable().optional(),
  loadingDockObs: z.string().nullable().optional(),
  wifi: z.boolean().nullable().optional(),
  wifiObs: z.string().nullable().optional(),
  officeSpace: z.boolean().nullable().optional(),
  officeSpaceObs: z.string().nullable().optional(),
});

export const personnelPoliciesSchema = z.object({
  shifts: z.array(z.string()).nullable().optional(), // ["1er turno", "2do turno", "3er turno"]
  shiftsObs: z.string().nullable().optional(),
  credentialRequired: z.boolean().nullable().optional(),
  credentialObs: z.string().nullable().optional(),
  ppeRequired: z.array(z.string()).nullable().optional(), // ["Casco", "Chaleco", "Botas", "Guantes", "Lentes"]
  ppeObs: z.string().nullable().optional(),
  diningArea: z.boolean().nullable().optional(),
  diningObs: z.string().nullable().optional(),
  restroomsAvailable: z.boolean().nullable().optional(),
  restroomsObs: z.string().nullable().optional(),
  hydrationProvided: z.boolean().nullable().optional(),
  hydrationObs: z.string().nullable().optional(),
  transportProvided: z.boolean().nullable().optional(),
  transportObs: z.string().nullable().optional(),
  uniformRequired: z.boolean().nullable().optional(),
  uniformObs: z.string().nullable().optional(),
});

export const transportPoliciesSchema = z.object({
  loadingSchedule: z.string().nullable().optional(),
  loadingScheduleObs: z.string().nullable().optional(),
  entryDocuments: z.string().nullable().optional(),
  entryDocumentsObs: z.string().nullable().optional(),
  weighingTypes: z.array(z.string()).nullable().optional(), // ["Báscula camionera", "Báscula de piso", "Otra"]
  weighingObs: z.string().nullable().optional(),
  maxStayTime: z.string().nullable().optional(),
  maxStayTimeObs: z.string().nullable().optional(),
});

export const allowedEquipmentSchema = z.object({
  scale: z.boolean().nullable().optional(),
  scaleObs: z.string().nullable().optional(),
  press: z.boolean().nullable().optional(),
  pressObs: z.string().nullable().optional(),
  forklift: z.boolean().nullable().optional(),
  forkliftObs: z.string().nullable().optional(),
  palletJack: z.boolean().nullable().optional(),
  palletJackObs: z.string().nullable().optional(),
});

export const legalRequirementsSchema = z.object({
  manifests: z.boolean().nullable().optional(),
  manifestFrequency: z.string().nullable().optional(),
  manifestObs: z.string().nullable().optional(),
  traceabilityLetter: z.boolean().nullable().optional(),
  traceabilityObs: z.string().nullable().optional(),
});

export const operationAreaSchema = z.object({
  length: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  covered: z.boolean().nullable().optional(),
  coveredObs: z.string().nullable().optional(),
});

// ─── Main surveys table ─────────────────────────────────

export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  // Link to prospect
  prospectId: integer("prospect_id").references(() => prospects.id),
  // Section 1: Generales
  clientName: text("client_name").notNull(),
  siteType: text("site_type"), // CEDIS | Planta | Otros
  siteTypeOther: text("site_type_other"),
  address: text("address"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  status: surveyStatusEnum("status").notNull().default("borrador_comercial"),
  type: text("type").notNull().default("Levantamiento"),
  estimatedVolume: text("estimated_volume"),
  estimatedValue: numeric("estimated_value", { precision: 12, scale: 2 }),
  nextStep: text("next_step"),
  hasReport: boolean("has_report").default(false),
  // JSONB sections (Sections 2-7)
  installations: jsonb("installations"), // Section 2
  personnelPolicies: jsonb("personnel_policies"), // Section 3
  transportPolicies: jsonb("transport_policies"), // Section 4
  allowedEquipment: jsonb("allowed_equipment"), // Section 5
  legalRequirements: jsonb("legal_requirements"), // Section 6
  operationArea: jsonb("operation_area"), // Section 7
  // Section 15: Observations
  observations: text("observations"),
  // Assigned users
  assignedCommercialId: integer("assigned_commercial_id").references(() => users.id),
  assignedOperationsId: integer("assigned_operations_id").references(() => users.id),
  // Section 16: Validation
  elaboratedById: integer("elaborated_by_id").references(() => users.id),
  approvedById: integer("approved_by_id").references(() => users.id),
  // Phase gates
  phase1CompletedAt: timestamp("phase1_completed_at"),
  phase2CompletedAt: timestamp("phase2_completed_at"),
  // Handoff from comercial
  sentById: integer("sent_by_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  rejectedById: integer("rejected_by_id").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  acceptedById: integer("accepted_by_id").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  schedulingNotes: text("scheduling_notes"),
  // Legacy columns (exist in DB)
  assignedToId: integer("assigned_to_id").references(() => users.id),
  generalInfo: jsonb("general_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  prospectIdIdx: index("surveys_prospect_id_idx").on(table.prospectId),
  statusIdx: index("surveys_status_idx").on(table.status),
  assignedCommercialIdx: index("surveys_assigned_commercial_id_idx").on(table.assignedCommercialId),
  assignedOperationsIdx: index("surveys_assigned_operations_id_idx").on(table.assignedOperationsId),
}));

// ─── Legacy table (kept temporarily) ────────────────────

export const surveyWasteTypes = pgTable("survey_waste_types", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  wasteType: text("waste_type").notNull(),
  quantity: text("quantity"),
  percentage: integer("percentage"),
  currentDestination: text("current_destination"),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }),
}, (table) => ({
  surveyIdIdx: index("survey_waste_types_survey_id_idx").on(table.surveyId),
}));

// ─── Kept table: competitor info ────────────────────────

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
  satisfactionLevel: integer("satisfaction_level"),
  reasonForChange: text("reason_for_change"),
}, (table) => ({
  surveyIdIdx: index("survey_current_services_survey_id_idx").on(table.surveyId),
}));

// ─── Section 8: Photos ──────────────────────────────────

export const surveyPhotos = pgTable("survey_photos", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  url: text("url").notNull(),
  caption: text("caption"),
  section: text("section"), // which area of the site
  sortOrder: integer("sort_order").default(0),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  surveyIdIdx: index("survey_photos_survey_id_idx").on(table.surveyId),
}));

// ─── Section 9: Proposal Personnel ──────────────────────

export const surveyProposalPersonnel = pgTable("survey_proposal_personnel", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  role: text("role").notNull(),
  quantity: integer("quantity").default(1),
  schedule: text("schedule"),
  observations: text("observations"),
}, (table) => ({
  surveyIdIdx: index("survey_proposal_personnel_survey_id_idx").on(table.surveyId),
}));

// ─── Section 10: Proposal Equipment ─────────────────────

export const surveyProposalEquipment = pgTable("survey_proposal_equipment", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  item: text("item").notNull(),
  quantity: integer("quantity").default(1),
  observations: text("observations"),
}, (table) => ({
  surveyIdIdx: index("survey_proposal_equipment_survey_id_idx").on(table.surveyId),
}));

// ─── Section 11: Proposal Supplies ──────────────────────

export const surveyProposalSupplies = pgTable("survey_proposal_supplies", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  item: text("item").notNull(),
  quantity: integer("quantity").default(1),
  observations: text("observations"),
}, (table) => ({
  surveyIdIdx: index("survey_proposal_supplies_survey_id_idx").on(table.surveyId),
}));

// ─── Section 12: Proposal Rentals ───────────────────────

export const surveyProposalRentals = pgTable("survey_proposal_rentals", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  item: text("item").notNull(),
  quantity: integer("quantity").default(1),
  observations: text("observations"),
}, (table) => ({
  surveyIdIdx: index("survey_proposal_rentals_survey_id_idx").on(table.surveyId),
}));

// ─── Section 13: Subproducts Catalog ────────────────────

export const surveySubproducts = pgTable("survey_subproducts", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  itemNumber: integer("item_number"),
  name: text("name").notNull(),
  um: text("um"), // unit of measure
  monthlyQty: numeric("monthly_qty", { precision: 12, scale: 2 }),
  characteristics: text("characteristics"),
  imageUrl: text("image_url"),
  collectionFrequency: text("collection_frequency"),
  transportRequired: text("transport_required"),
  storage: text("storage"),
}, (table) => ({
  surveyIdIdx: index("survey_subproducts_survey_id_idx").on(table.surveyId),
}));

// ─── Section 14: Services Catalog ───────────────────────

export const surveyServices = pgTable("survey_services", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  itemNumber: integer("item_number"),
  serviceName: text("service_name").notNull(),
  characteristic: text("characteristic"),
  um: text("um"),
  monthlyQty: numeric("monthly_qty", { precision: 12, scale: 2 }),
  imageUrl: text("image_url"),
  collectionFrequency: text("collection_frequency"),
  equipmentRequired: text("equipment_required"),
  suggestedTreatment: text("suggested_treatment"),
}, (table) => ({
  surveyIdIdx: index("survey_services_survey_id_idx").on(table.surveyId),
}));

// ─── Gate Configuration (admin-configurable required fields) ─

export const surveyGateConfigs = pgTable("survey_gate_configs", {
  id: serial("id").primaryKey(),
  gate: text("gate").notNull(), // "phase1" | "phase2"
  section: text("section").notNull(), // "generales" | "installations" | ...
  fieldPath: text("field_path").notNull(), // "clientName" | "installations.lighting" | ...
  label: text("label").notNull(), // Human-readable label in Spanish
  fieldType: text("field_type").notNull().default("boolean"), // boolean | text | number | jsonb_field
  isRequired: boolean("is_required").default(true),
});

// ─── Operational documents ──────────────────────────────

export const operationalDocuments = pgTable("operational_documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  issueDate: timestamp("issue_date"),
  expirationDate: timestamp("expiration_date"),
  fileName: text("file_name"),
  status: documentStatusEnum("status").notNull().default("vigente"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Insert schemas ─────────────────────────────────────

export const insertSurveySchema = createInsertSchema(surveys, {
  clientName: z.string().min(1).max(200),
  type: z.string().min(1).max(50).optional(),
  siteType: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSurveyWasteTypeSchema = createInsertSchema(surveyWasteTypes, {
  wasteType: z.string().min(1).max(100),
}).omit({ id: true });

export const insertSurveyPhotoSchema = createInsertSchema(surveyPhotos, {
  url: z.string().min(1).max(2000),
}).omit({ id: true, createdAt: true });

export const insertSurveyProposalPersonnelSchema = createInsertSchema(surveyProposalPersonnel, {
  role: z.string().min(1).max(200),
}).omit({ id: true });

export const insertSurveyProposalEquipmentSchema = createInsertSchema(surveyProposalEquipment, {
  item: z.string().min(1).max(200),
}).omit({ id: true });

export const insertSurveyProposalSuppliesSchema = createInsertSchema(surveyProposalSupplies, {
  item: z.string().min(1).max(200),
}).omit({ id: true });

export const insertSurveyProposalRentalsSchema = createInsertSchema(surveyProposalRentals, {
  item: z.string().min(1).max(200),
}).omit({ id: true });

export const insertSurveySubproductSchema = createInsertSchema(surveySubproducts, {
  name: z.string().min(1).max(300),
}).omit({ id: true });

export const insertSurveyServiceSchema = createInsertSchema(surveyServices, {
  serviceName: z.string().min(1).max(300),
}).omit({ id: true });

export const insertGateConfigSchema = createInsertSchema(surveyGateConfigs, {
  gate: z.string().min(1).max(50),
  section: z.string().min(1).max(100),
  fieldPath: z.string().min(1).max(200),
  label: z.string().min(1).max(300),
}).omit({ id: true });

export const insertDocumentSchema = createInsertSchema(operationalDocuments, {
  name: z.string().min(1).max(300),
  type: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
}).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Types ──────────────────────────────────────────────

export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type SurveyWasteType = typeof surveyWasteTypes.$inferSelect;
export type SurveyPhoto = typeof surveyPhotos.$inferSelect;
export type SurveyProposalPersonnel = typeof surveyProposalPersonnel.$inferSelect;
export type SurveyProposalEquipment = typeof surveyProposalEquipment.$inferSelect;
export type SurveyProposalSupplies = typeof surveyProposalSupplies.$inferSelect;
export type SurveyProposalRentals = typeof surveyProposalRentals.$inferSelect;
export type SurveySubproduct = typeof surveySubproducts.$inferSelect;
export type SurveyService = typeof surveyServices.$inferSelect;
export type SurveyGateConfig = typeof surveyGateConfigs.$inferSelect;
export type OperationalDocument = typeof operationalDocuments.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Installations = z.infer<typeof installationsSchema>;
export type PersonnelPolicies = z.infer<typeof personnelPoliciesSchema>;
export type TransportPolicies = z.infer<typeof transportPoliciesSchema>;
export type AllowedEquipment = z.infer<typeof allowedEquipmentSchema>;
export type LegalRequirements = z.infer<typeof legalRequirementsSchema>;
export type OperationArea = z.infer<typeof operationAreaSchema>;

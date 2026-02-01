import { pgTable, serial, text, integer, timestamp, boolean, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const reportStatusEnum = pgEnum("report_status", [
  "pendiente",
  "en_proceso",
  "enviado",
  "confirmado",
]);

// Service clients (clientes con servicio activo de Innovative)
export const serviceClients = pgTable("service_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  branchCount: integer("branch_count").default(1),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  operationStartDate: timestamp("operation_start_date"),
  monthlyAverage: numeric("monthly_average", { precision: 10, scale: 2 }), // ton/mes
  servicesContracted: jsonb("services_contracted"), // string[]
  wasteTypes: jsonb("waste_types"), // string[]
  collectionFrequency: text("collection_frequency"),
  valorizationRate: numeric("valorization_rate", { precision: 5, scale: 2 }),
  reportRequirements: jsonb("report_requirements"), // string[] (GRI, SASB, ESR, ISO 14001, etc.)
  // Final destinations
  recyclingDestination: text("recycling_destination"),
  compostDestination: text("compost_destination"),
  reuseDestination: text("reuse_destination"),
  landfillDestination: text("landfill_destination"),
  // Environmental registries
  recyclingRegistry: text("recycling_registry"),
  compostRegistry: text("compost_registry"),
  reuseRegistry: text("reuse_registry"),
  landfillRegistry: text("landfill_registry"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Monthly traceability records per client
export const traceabilityRecords = pgTable("traceability_records", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => serviceClients.id).notNull(),
  period: text("period").notNull(), // e.g. "2025-11"
  // Waste categories in kg
  recyclingKg: numeric("recycling_kg", { precision: 12, scale: 2 }).default("0"),
  compostKg: numeric("compost_kg", { precision: 12, scale: 2 }).default("0"),
  reuseKg: numeric("reuse_kg", { precision: 12, scale: 2 }).default("0"),
  landfillKg: numeric("landfill_kg", { precision: 12, scale: 2 }).default("0"),
  // Material breakdown stored as JSON
  recyclingBreakdown: jsonb("recycling_breakdown"), // [{material, quantity}]
  compostBreakdown: jsonb("compost_breakdown"),
  reuseBreakdown: jsonb("reuse_breakdown"),
  // Environmental impact
  treesSaved: integer("trees_saved"),
  co2Avoided: numeric("co2_avoided", { precision: 10, scale: 2 }), // tons
  waterSaved: integer("water_saved"), // liters
  // Revenue
  monthlyRevenue: numeric("monthly_revenue", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client reports (monthly reports sent to clients)
export const clientReports = pgTable("client_reports", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => serviceClients.id).notNull(),
  period: text("period").notNull(), // e.g. "2025-11"
  status: reportStatusEnum("status").notNull().default("pendiente"),
  sentDate: timestamp("sent_date"),
  confirmedDate: timestamp("confirmed_date"),
  nextReportDate: timestamp("next_report_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Economic models / proposals
export const economicModels = pgTable("economic_models", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => serviceClients.id),
  prospectName: text("prospect_name"), // for new prospects without client record
  title: text("title").notNull(),
  monthlyVolume: text("monthly_volume"),
  proposedPrice: numeric("proposed_price", { precision: 12, scale: 2 }),
  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  estimatedMargin: numeric("estimated_margin", { precision: 5, scale: 2 }),
  servicesIncluded: jsonb("services_included"), // string[]
  wasteComposition: jsonb("waste_composition"), // [{type, percentage, valorization}]
  status: text("status").default("borrador"), // borrador, enviada, aprobada, rechazada
  approvedBy: text("approved_by"),
  approvedDate: timestamp("approved_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service conciliation (monthly service vs billed reconciliation)
export const serviceConciliations = pgTable("service_conciliations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => serviceClients.id).notNull(),
  period: text("period").notNull(),
  rmeManaged: numeric("rme_managed", { precision: 10, scale: 2 }), // tons managed
  valorizationAchieved: numeric("valorization_achieved", { precision: 5, scale: 2 }),
  monthlyRevenue: numeric("monthly_revenue", { precision: 12, scale: 2 }),
  servicesDelivered: jsonb("services_delivered"), // string[]
  discrepancies: text("discrepancies"),
  isReconciled: boolean("is_reconciled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validators
export const insertServiceClientSchema = createInsertSchema(serviceClients, {
  name: z.string().min(1).max(200),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertTraceabilitySchema = createInsertSchema(traceabilityRecords, {
  period: z.string().regex(/^\d{4}-\d{2}$/),
}).omit({ id: true, createdAt: true });

export const insertClientReportSchema = createInsertSchema(clientReports, {
  period: z.string().regex(/^\d{4}-\d{2}$/),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertEconomicModelSchema = createInsertSchema(economicModels, {
  title: z.string().min(1).max(300),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type ServiceClient = typeof serviceClients.$inferSelect;
export type InsertServiceClient = z.infer<typeof insertServiceClientSchema>;
export type TraceabilityRecord = typeof traceabilityRecords.$inferSelect;
export type ClientReport = typeof clientReports.$inferSelect;
export type EconomicModel = typeof economicModels.$inferSelect;
export type ServiceConciliation = typeof serviceConciliations.$inferSelect;

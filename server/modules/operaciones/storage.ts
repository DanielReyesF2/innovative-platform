import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { prospects } from "../../../shared/schema/comercial";
import { users } from "../../../shared/schema/common";
import {
  allowedEquipmentSchema,
  type InsertDocument,
  type InsertSurvey,
  installationsSchema,
  legalRequirementsSchema,
  operationAreaSchema,
  operationalDocuments,
  personnelPoliciesSchema,
  type Survey,
  surveyCurrentServices,
  surveyGateConfigs,
  surveyPhotos,
  surveyProposalEquipment,
  surveyProposalPersonnel,
  surveyProposalRentals,
  surveyProposalSupplies,
  surveyServices,
  surveySubproducts,
  surveys,
  surveyWasteTypes,
  transportPoliciesSchema,
} from "../../../shared/schema/operaciones";
import { db } from "../../db";

// ─── JSONB section name → column + zod schema mapping ───

const SECTION_MAP: Record<string, { column: keyof typeof surveys; schema: any }> = {
  installations: { column: "installations", schema: installationsSchema },
  personnelPolicies: { column: "personnelPolicies", schema: personnelPoliciesSchema },
  transportPolicies: { column: "transportPolicies", schema: transportPoliciesSchema },
  allowedEquipment: { column: "allowedEquipment", schema: allowedEquipmentSchema },
  legalRequirements: { column: "legalRequirements", schema: legalRequirementsSchema },
  operationArea: { column: "operationArea", schema: operationAreaSchema },
};

// ─── Status transition rules ────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  borrador_comercial: ["pendiente_operaciones", "cancelado"],
  pendiente_operaciones: ["agendado", "borrador_comercial", "cancelado"],
  agendado: ["en_sitio", "cancelado"],
  en_sitio: ["completado", "agendado", "cancelado"],
  completado: [],
  cancelado: ["borrador_comercial"],
};

// ─── Surveys ────────────────────────────────────────────

export async function getSurveys() {
  return db.query.surveys.findMany({
    orderBy: [desc(surveys.createdAt)],
  });
}

export async function getSurveyById(id: number) {
  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.id, id),
  });
  if (!survey) return null;

  const [
    wasteTypes,
    currentServices,
    photos,
    subproducts,
    services,
    proposalPersonnel,
    proposalEquipment,
    proposalSupplies,
    proposalRentals,
  ] = await Promise.all([
    db.query.surveyWasteTypes.findMany({ where: eq(surveyWasteTypes.surveyId, id) }),
    db.query.surveyCurrentServices.findMany({ where: eq(surveyCurrentServices.surveyId, id) }),
    db.query.surveyPhotos.findMany({ where: eq(surveyPhotos.surveyId, id) }),
    db.query.surveySubproducts.findMany({ where: eq(surveySubproducts.surveyId, id) }),
    db.query.surveyServices.findMany({ where: eq(surveyServices.surveyId, id) }),
    db.query.surveyProposalPersonnel.findMany({ where: eq(surveyProposalPersonnel.surveyId, id) }),
    db.query.surveyProposalEquipment.findMany({ where: eq(surveyProposalEquipment.surveyId, id) }),
    db.query.surveyProposalSupplies.findMany({ where: eq(surveyProposalSupplies.surveyId, id) }),
    db.query.surveyProposalRentals.findMany({ where: eq(surveyProposalRentals.surveyId, id) }),
  ]);

  return {
    ...survey,
    wasteTypes,
    currentServices,
    photos,
    subproducts,
    services,
    proposalPersonnel,
    proposalEquipment,
    proposalSupplies,
    proposalRentals,
  };
}

export async function getSurveysByStatus(status: string) {
  return db.query.surveys.findMany({
    where: eq(surveys.status, status as Survey["status"]),
    orderBy: [desc(surveys.createdAt)],
  });
}

export async function createSurvey(data: InsertSurvey) {
  const [survey] = await db.insert(surveys).values(data).returning();
  return survey;
}

export async function createSurveyFromProspect(prospectId: number, assignedCommercialId: number) {
  const prospect = await db.query.prospects.findFirst({
    where: eq(prospects.id, prospectId),
  });
  if (!prospect) throw new Error("Prospecto no encontrado");

  const [survey] = await db
    .insert(surveys)
    .values({
      prospectId,
      clientName: prospect.name,
      address: prospect.location,
      estimatedVolume: prospect.estimatedVolume,
      estimatedValue: prospect.estimatedValue,
      assignedCommercialId: assignedCommercialId,
      status: "borrador_comercial",
      type: "Levantamiento",
    })
    .returning();

  return survey;
}

export async function updateSurvey(id: number, data: Partial<InsertSurvey>) {
  const [updated] = await db
    .update(surveys)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(surveys.id, id))
    .returning();
  return updated;
}

// ─── Section-level JSONB update ─────────────────────────

export async function updateSurveySection(id: number, sectionName: string, data: any) {
  const sectionConfig = SECTION_MAP[sectionName];
  if (!sectionConfig) throw new Error(`Sección desconocida: ${sectionName}`);

  // Validate data against the section schema (partial)
  const parsed = sectionConfig.schema.partial().parse(data);

  // Get current value to merge
  const current = await db.query.surveys.findFirst({
    where: eq(surveys.id, id),
  });
  if (!current) throw new Error("Levantamiento no encontrado");

  const currentValue = (current as Record<string, unknown>)[sectionConfig.column as string] || {};
  const merged = { ...(currentValue as Record<string, unknown>), ...parsed };

  const [updated] = await db
    .update(surveys)
    .set({ [sectionConfig.column]: merged, updatedAt: new Date() } as Partial<InsertSurvey>)
    .where(eq(surveys.id, id))
    .returning();

  return updated;
}

// ─── Gate completeness check ────────────────────────────

export async function checkGateCompleteness(surveyId: number, gateName: string) {
  const survey = await getSurveyById(surveyId);
  if (!survey) throw new Error("Levantamiento no encontrado");

  const configs = await db.query.surveyGateConfigs.findMany({
    where: and(eq(surveyGateConfigs.gate, gateName), eq(surveyGateConfigs.isRequired, true)),
  });

  if (configs.length === 0) {
    return { complete: true, percentage: 100, total: 0, filled: 0, missing: [] };
  }

  const missing: { fieldPath: string; label: string; section: string }[] = [];
  let filled = 0;

  for (const config of configs) {
    const value = resolveFieldValue(survey, config.section, config.fieldPath);
    if (isFieldFilled(value)) {
      filled++;
    } else {
      missing.push({
        fieldPath: config.fieldPath,
        label: config.label,
        section: config.section,
      });
    }
  }

  const percentage = Math.round((filled / configs.length) * 100);

  return {
    complete: missing.length === 0,
    percentage,
    total: configs.length,
    filled,
    missing,
  };
}

const JSONB_SECTIONS = new Set([
  "installations",
  "personnelPolicies",
  "transportPolicies",
  "allowedEquipment",
  "legalRequirements",
  "operationArea",
]);

function resolveFieldValue(survey: any, section: string, fieldPath: string): any {
  if (section === "generales") {
    return survey[fieldPath];
  }

  // For JSONB sections, look up section object then field within it
  if (JSONB_SECTIONS.has(section)) {
    const jsonbData = survey[section];
    if (!jsonbData) return undefined;
    return jsonbData[fieldPath];
  }

  // For relational tables (subproducts, services)
  if (section === "subproductos") {
    return survey.subproducts?.length > 0 ? survey.subproducts : undefined;
  }
  if (section === "servicios") {
    return survey.services?.length > 0 ? survey.services : undefined;
  }

  return survey[fieldPath];
}

function isFieldFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

// ─── Status advancement with gate validation ────────────

export async function advanceSurveyStatus(id: number, targetStatus: string) {
  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.id, id),
  });
  if (!survey) throw new Error("Levantamiento no encontrado");

  const allowed = VALID_TRANSITIONS[survey.status];
  if (!allowed?.includes(targetStatus)) {
    throw new Error(`Transición no permitida: ${survey.status} → ${targetStatus}`);
  }

  // Check gate if advancing to pendiente_operaciones (phase 1 gate)
  if (targetStatus === "pendiente_operaciones") {
    const gate = await checkGateCompleteness(id, "phase1");
    if (!gate.complete) {
      return {
        success: false,
        message: "No se puede avanzar: faltan campos requeridos",
        gate,
      };
    }
  }

  // Check gate if advancing to completado (phase 2 gate)
  if (targetStatus === "completado") {
    const gate = await checkGateCompleteness(id, "phase2");
    if (!gate.complete) {
      return {
        success: false,
        message: "No se puede completar: faltan campos requeridos de operaciones",
        gate,
      };
    }
  }

  const updateData: Partial<InsertSurvey> & { updatedAt: Date } = {
    status: targetStatus as Survey["status"],
    updatedAt: new Date(),
  };

  if (targetStatus === "pendiente_operaciones") {
    updateData.phase1CompletedAt = new Date();
  }
  if (targetStatus === "completado") {
    updateData.phase2CompletedAt = new Date();
    updateData.completedDate = new Date();
  }

  const [updated] = await db.update(surveys).set(updateData).where(eq(surveys.id, id)).returning();

  return { success: true, survey: updated };
}

// ─── Survey waste types ─────────────────────────────────

export async function addSurveyWasteType(data: {
  surveyId: number;
  wasteType: string;
  quantity?: string;
  percentage?: number;
  currentDestination?: string;
  monthlyCost?: string;
}) {
  const [wt] = await db.insert(surveyWasteTypes).values(data).returning();
  return wt;
}

// ─── Survey Photos (Section 8) ──────────────────────────

export async function getSurveyPhotos(surveyId: number) {
  return db.query.surveyPhotos.findMany({
    where: eq(surveyPhotos.surveyId, surveyId),
  });
}

export async function createSurveyPhoto(data: any) {
  const [photo] = await db.insert(surveyPhotos).values(data).returning();
  return photo;
}

export async function updateSurveyPhoto(id: number, data: any) {
  const [updated] = await db.update(surveyPhotos).set(data).where(eq(surveyPhotos.id, id)).returning();
  return updated;
}

export async function deleteSurveyPhoto(id: number) {
  await db.delete(surveyPhotos).where(eq(surveyPhotos.id, id));
}

// ─── Survey Subproducts (Section 13) ────────────────────

export async function getSurveySubproducts(surveyId: number) {
  return db.query.surveySubproducts.findMany({
    where: eq(surveySubproducts.surveyId, surveyId),
  });
}

export async function createSurveySubproduct(data: any) {
  const [item] = await db.insert(surveySubproducts).values(data).returning();
  return item;
}

export async function updateSurveySubproduct(id: number, data: any) {
  const [updated] = await db.update(surveySubproducts).set(data).where(eq(surveySubproducts.id, id)).returning();
  return updated;
}

export async function deleteSurveySubproduct(id: number) {
  await db.delete(surveySubproducts).where(eq(surveySubproducts.id, id));
}

// ─── Survey Services (Section 14) ───────────────────────

export async function getSurveyServicesItems(surveyId: number) {
  return db.query.surveyServices.findMany({
    where: eq(surveyServices.surveyId, surveyId),
  });
}

export async function createSurveyService(data: any) {
  const [item] = await db.insert(surveyServices).values(data).returning();
  return item;
}

export async function updateSurveyService(id: number, data: any) {
  const [updated] = await db.update(surveyServices).set(data).where(eq(surveyServices.id, id)).returning();
  return updated;
}

export async function deleteSurveyService(id: number) {
  await db.delete(surveyServices).where(eq(surveyServices.id, id));
}

// ─── Proposal Personnel (Section 9) ─────────────────────

export async function getSurveyProposalPersonnel(surveyId: number) {
  return db.query.surveyProposalPersonnel.findMany({
    where: eq(surveyProposalPersonnel.surveyId, surveyId),
  });
}

export async function createProposalPersonnel(data: any) {
  const [item] = await db.insert(surveyProposalPersonnel).values(data).returning();
  return item;
}

export async function updateProposalPersonnel(id: number, data: any) {
  const [updated] = await db
    .update(surveyProposalPersonnel)
    .set(data)
    .where(eq(surveyProposalPersonnel.id, id))
    .returning();
  return updated;
}

export async function deleteProposalPersonnel(id: number) {
  await db.delete(surveyProposalPersonnel).where(eq(surveyProposalPersonnel.id, id));
}

// ─── Proposal Equipment (Section 10) ────────────────────

export async function getSurveyProposalEquipment(surveyId: number) {
  return db.query.surveyProposalEquipment.findMany({
    where: eq(surveyProposalEquipment.surveyId, surveyId),
  });
}

export async function createProposalEquipment(data: any) {
  const [item] = await db.insert(surveyProposalEquipment).values(data).returning();
  return item;
}

export async function updateProposalEquipment(id: number, data: any) {
  const [updated] = await db
    .update(surveyProposalEquipment)
    .set(data)
    .where(eq(surveyProposalEquipment.id, id))
    .returning();
  return updated;
}

export async function deleteProposalEquipment(id: number) {
  await db.delete(surveyProposalEquipment).where(eq(surveyProposalEquipment.id, id));
}

// ─── Proposal Supplies (Section 11) ─────────────────────

export async function getSurveyProposalSupplies(surveyId: number) {
  return db.query.surveyProposalSupplies.findMany({
    where: eq(surveyProposalSupplies.surveyId, surveyId),
  });
}

export async function createProposalSupplies(data: any) {
  const [item] = await db.insert(surveyProposalSupplies).values(data).returning();
  return item;
}

export async function updateProposalSupplies(id: number, data: any) {
  const [updated] = await db
    .update(surveyProposalSupplies)
    .set(data)
    .where(eq(surveyProposalSupplies.id, id))
    .returning();
  return updated;
}

export async function deleteProposalSupplies(id: number) {
  await db.delete(surveyProposalSupplies).where(eq(surveyProposalSupplies.id, id));
}

// ─── Proposal Rentals (Section 12) ──────────────────────

export async function getSurveyProposalRentals(surveyId: number) {
  return db.query.surveyProposalRentals.findMany({
    where: eq(surveyProposalRentals.surveyId, surveyId),
  });
}

export async function createProposalRentals(data: any) {
  const [item] = await db.insert(surveyProposalRentals).values(data).returning();
  return item;
}

export async function updateProposalRentals(id: number, data: any) {
  const [updated] = await db
    .update(surveyProposalRentals)
    .set(data)
    .where(eq(surveyProposalRentals.id, id))
    .returning();
  return updated;
}

export async function deleteProposalRentals(id: number) {
  await db.delete(surveyProposalRentals).where(eq(surveyProposalRentals.id, id));
}

// ─── Gate Config Admin ──────────────────────────────────

export async function getGateConfigs() {
  return db.query.surveyGateConfigs.findMany();
}

export async function createGateConfig(data: any) {
  const [config] = await db.insert(surveyGateConfigs).values(data).returning();
  return config;
}

export async function updateGateConfig(id: number, data: any) {
  const [updated] = await db.update(surveyGateConfigs).set(data).where(eq(surveyGateConfigs.id, id)).returning();
  return updated;
}

// ─── Documents ──────────────────────────────────────────

export async function getDocuments() {
  return db.query.operationalDocuments.findMany({
    orderBy: [desc(operationalDocuments.expirationDate)],
  });
}

export async function getDocumentById(id: number) {
  return db.query.operationalDocuments.findFirst({
    where: eq(operationalDocuments.id, id),
  });
}

export async function getExpiringDocuments(daysAhead: number = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return db
    .select()
    .from(operationalDocuments)
    .where(and(lte(operationalDocuments.expirationDate, futureDate), gte(operationalDocuments.expirationDate, now)));
}

export async function getExpiredDocuments() {
  return db.select().from(operationalDocuments).where(lte(operationalDocuments.expirationDate, new Date()));
}

export async function createDocument(data: InsertDocument) {
  const [doc] = await db.insert(operationalDocuments).values(data).returning();
  return doc;
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const [updated] = await db
    .update(operationalDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(operationalDocuments.id, id))
    .returning();
  return updated;
}

export async function deleteDocument(id: number) {
  await db.delete(operationalDocuments).where(eq(operationalDocuments.id, id));
}

// ─── Handoff: Pending review, Accept, Reject ────────────

export async function getPendingReviewSurveys() {
  return db.query.surveys.findMany({
    where: eq(surveys.status, "pendiente_operaciones" as Survey["status"]),
    orderBy: [desc(surveys.createdAt)],
  });
}

export async function acceptSurvey(
  id: number,
  data: { scheduledDate: Date; assignedToId: number; schedulingNotes?: string },
  acceptedById: number,
) {
  const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, id) });
  if (!survey) throw new Error("NOT_FOUND");
  if (survey.status !== "pendiente_operaciones") {
    throw new Error("CONFLICT:Solo se pueden aceptar solicitudes en estado 'pendiente_operaciones'");
  }

  const [updated] = await db
    .update(surveys)
    .set({
      status: "agendado",
      scheduledDate: data.scheduledDate,
      assignedOperationsId: data.assignedToId,
      schedulingNotes: data.schedulingNotes || null,
      acceptedById,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(surveys.id, id))
    .returning();
  return updated;
}

export async function rejectSurvey(id: number, rejectionReason: string, rejectedById: number) {
  const survey = await db.query.surveys.findFirst({ where: eq(surveys.id, id) });
  if (!survey) throw new Error("NOT_FOUND");
  if (survey.status !== "pendiente_operaciones") {
    throw new Error("CONFLICT:Solo se pueden rechazar solicitudes en estado 'pendiente_operaciones'");
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(surveys)
      .set({
        status: "rechazado",
        rejectionReason,
        rejectedById,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(surveys.id, id))
      .returning();

    if (updated.prospectId) {
      await tx
        .update(prospects)
        .set({
          stage: "lead",
          surveyId: null,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, updated.prospectId));
    }

    return { survey: updated };
  });

  return result;
}

// ─── Summary stats ──────────────────────────────────────

export async function getSurveySummary() {
  const statuses = ["borrador_comercial", "pendiente_operaciones", "agendado", "en_sitio", "completado"];
  const results: Record<string, number> = {};

  for (const status of statuses) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(surveys)
      .where(eq(surveys.status, status as Survey["status"]));
    results[status] = row.count;
  }

  return results;
}

// ─── Ops Team Dashboard ─────────────────────────────────

export async function getOpsTeamStats() {
  // Get all operaciones users
  const opsUsers = await db.query.users.findMany({
    where: eq(users.role, "operaciones"),
    columns: { id: true, name: true, email: true, codigo: true },
  });

  // Get all surveys with an assigned ops user
  const allSurveys = await db.query.surveys.findMany({
    columns: {
      id: true,
      status: true,
      assignedOperationsId: true,
      acceptedAt: true,
      createdAt: true,
      completedDate: true,
    },
  });

  return opsUsers.map((user) => {
    const mySurveys = allSurveys.filter((s) => s.assignedOperationsId === user.id);
    const assigned = mySurveys.filter((s) => s.status === "agendado" || s.status === "en_sitio").length;
    const completed = mySurveys.filter((s) => s.status === "completado").length;
    const total = mySurveys.length;

    // Avg response time: time between createdAt and acceptedAt (in hours)
    const responseTimes = mySurveys
      .filter((s) => s.acceptedAt && s.createdAt)
      .map((s) => (new Date(s.acceptedAt!).getTime() - new Date(s.createdAt!).getTime()) / (1000 * 60 * 60));
    const avgResponseHours =
      responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      codigo: user.codigo,
      assigned,
      completed,
      total,
      avgResponseHours,
    };
  });
}

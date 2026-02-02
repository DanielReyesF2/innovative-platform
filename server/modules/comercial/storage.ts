import { db } from "../../db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  prospects,
  leads,
  rejectionReasons,
  salesMetrics,
  pipelineSnapshots,
  type InsertProspect,
  type InsertLead,
} from "../../../shared/schema/comercial";
import {
  surveys,
  surveyWasteTypes,
  surveyCurrentServices,
} from "../../../shared/schema/operaciones";

// --- Prospects ---

export async function getProspects() {
  return db.query.prospects.findMany({
    orderBy: [desc(prospects.updatedAt)],
  });
}

export async function getProspectById(id: number) {
  return db.query.prospects.findFirst({
    where: eq(prospects.id, id),
  });
}

export async function getProspectsByStage(stage: string) {
  return db.query.prospects.findMany({
    where: eq(prospects.stage, stage as any),
    orderBy: [desc(prospects.probability)],
  });
}

export async function createProspect(data: InsertProspect) {
  const [prospect] = await db.insert(prospects).values(data).returning();
  return prospect;
}

export async function updateProspect(id: number, data: Partial<InsertProspect>) {
  const [updated] = await db
    .update(prospects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(prospects.id, id))
    .returning();
  return updated;
}

export async function rejectProspect(
  id: number,
  rejectionReasonId: number,
  rejectionDetail: string
) {
  const [updated] = await db
    .update(prospects)
    .set({
      stage: "rechazada",
      probability: 0,
      rejectionReasonId,
      rejectionDetail,
      rejectionDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, id))
    .returning();
  return updated;
}

// --- Leads ---

export async function getLeads() {
  return db.query.leads.findMany({
    where: eq(leads.isActive, true),
    orderBy: [desc(leads.createdAt)],
  });
}

export async function createLead(data: InsertLead) {
  const [lead] = await db.insert(leads).values(data).returning();
  return lead;
}

export async function assignLead(id: number, assignedToId: number) {
  const [updated] = await db
    .update(leads)
    .set({ assignedToId })
    .where(eq(leads.id, id))
    .returning();
  return updated;
}

export async function convertLeadToProspect(leadId: number, prospectId: number) {
  const [updated] = await db
    .update(leads)
    .set({ convertedToProspectId: prospectId, isActive: false })
    .where(eq(leads.id, leadId))
    .returning();
  return updated;
}

// --- Rejection Reasons ---

export async function getRejectionReasons() {
  return db.query.rejectionReasons.findMany({
    where: eq(rejectionReasons.isActive, true),
  });
}

// --- Pipeline ---

export async function getPipelineSummary() {
  const stages = ["lead", "levantamiento", "propuesta", "negociacion", "cierre"];
  const results = [];

  for (const stage of stages) {
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(${prospects.estimatedValue}), 0)`,
      })
      .from(prospects)
      .where(and(eq(prospects.stage, stage as any)));

    results.push({
      stage,
      count: row.count,
      totalValue: row.totalValue,
    });
  }

  return results;
}

// --- Sales Metrics ---

export async function getSalesMetrics(period?: string) {
  if (period) {
    return db.query.salesMetrics.findMany({
      where: eq(salesMetrics.period, period),
    });
  }
  return db.query.salesMetrics.findMany({
    orderBy: [desc(salesMetrics.period)],
  });
}

export async function getSalesMetricsByUser(userId: number) {
  return db.query.salesMetrics.findMany({
    where: eq(salesMetrics.userId, userId),
    orderBy: [desc(salesMetrics.period)],
  });
}

// --- Handoff to Operaciones ---

export async function sendProspectToOperaciones(prospectId: number, sentById: number) {
  // Read prospect outside transaction for validation
  const prospect = await db.query.prospects.findFirst({
    where: eq(prospects.id, prospectId),
  });
  if (!prospect) throw new Error("NOT_FOUND");

  // State guard: only "lead" stage can be sent
  if (prospect.stage !== "lead") {
    throw new Error("CONFLICT:El prospecto no esta en etapa 'lead'");
  }

  // Idempotency: check no active survey exists
  if (prospect.surveyId) {
    const existing = await db.query.surveys.findFirst({
      where: eq(surveys.id, prospect.surveyId),
    });
    if (existing && existing.status !== "rechazado") {
      throw new Error("CONFLICT:Este prospecto ya tiene una solicitud activa");
    }
  }

  // Validate levantamiento data
  const levData = prospect.levantamientoData as any;
  if (!levData?.generalInfo?.razonSocial) {
    throw new Error("VALIDATION:Se requiere al menos razon social en datos de levantamiento");
  }
  if (!levData?.wasteTypes?.length || !levData.wasteTypes[0]?.wasteType) {
    throw new Error("VALIDATION:Se requiere al menos un tipo de residuo");
  }

  // All writes in a single transaction
  const result = await db.transaction(async (tx) => {
    // Create survey (scheduledDate = null until operaciones accepts)
    const [survey] = await tx
      .insert(surveys)
      .values({
        clientName: prospect.name,
        status: "pendiente_operaciones",
        type: "Levantamiento",
        estimatedVolume: prospect.estimatedVolume,
        estimatedValue: prospect.estimatedValue,
        address: levData.generalInfo?.direccion || null,
        prospectId: prospect.id,
        sentById,
      })
      .returning();

    // Insert waste types
    for (const wt of levData.wasteTypes) {
      if (!wt.wasteType) continue;
      await tx.insert(surveyWasteTypes).values({
        surveyId: survey.id,
        wasteType: wt.wasteType,
        quantity: wt.quantity || null,
        percentage: wt.percentage ? Number(wt.percentage) : null,
        currentDestination: wt.currentDestination || null,
        monthlyCost: wt.monthlyCost || null,
      });
    }

    // Insert current services (explicit mapping to avoid type mismatches from jsonb)
    if (levData.currentServices && Object.keys(levData.currentServices).length > 0) {
      const cs = levData.currentServices;
      await tx.insert(surveyCurrentServices).values({
        surveyId: survey.id,
        providerName: cs.providerName || null,
        contractActive: cs.contractActive ?? false,
        contractStart: cs.contractStart ? new Date(cs.contractStart) : null,
        contractEnd: cs.contractEnd ? new Date(cs.contractEnd) : null,
        monthlyCost: cs.monthlyCost || null,
        collectionFrequency: cs.collectionFrequency || null,
        serviceType: cs.serviceType || null,
        includesSeparation: cs.includesSeparation ?? false,
        includesValorization: cs.includesValorization ?? false,
        includesReporting: cs.includesReporting ?? false,
        satisfactionLevel: cs.satisfactionLevel ? Number(cs.satisfactionLevel) || null : null,
        reasonForChange: cs.reasonForChange || null,
      });
    }

    // Note: infrastructure & needs data stays in prospect.levantamientoData
    // (surveyInfrastructure/surveyNeeds tables were replaced by on-site JSONB sections)

    // Update prospect
    const [updated] = await tx
      .update(prospects)
      .set({
        stage: "levantamiento",
        surveyId: survey.id,
        sentToOpsAt: new Date(),
        sentToOpsById: sentById,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId))
      .returning();

    return { prospect: updated, surveyId: survey.id };
  });

  return result;
}

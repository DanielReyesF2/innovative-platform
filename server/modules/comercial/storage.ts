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

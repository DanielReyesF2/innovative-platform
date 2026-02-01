import { db } from "../../db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  serviceClients,
  traceabilityRecords,
  clientReports,
  economicModels,
  serviceConciliations,
  type InsertServiceClient,
} from "../../../shared/schema/subproductos";

// --- Service Clients ---

export async function getServiceClients() {
  return db.query.serviceClients.findMany({
    where: eq(serviceClients.isActive, true),
    orderBy: [desc(serviceClients.name)],
  });
}

export async function getServiceClientById(id: number) {
  return db.query.serviceClients.findFirst({
    where: eq(serviceClients.id, id),
  });
}

export async function createServiceClient(data: InsertServiceClient) {
  const [client] = await db.insert(serviceClients).values(data).returning();
  return client;
}

export async function updateServiceClient(id: number, data: Partial<InsertServiceClient>) {
  const [updated] = await db
    .update(serviceClients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(serviceClients.id, id))
    .returning();
  return updated;
}

// --- Traceability ---

export async function getTraceabilityByClient(clientId: number) {
  return db.query.traceabilityRecords.findMany({
    where: eq(traceabilityRecords.clientId, clientId),
    orderBy: [desc(traceabilityRecords.period)],
  });
}

export async function getTraceabilityByPeriod(period: string) {
  return db.query.traceabilityRecords.findMany({
    where: eq(traceabilityRecords.period, period),
  });
}

export async function createTraceabilityRecord(data: any) {
  const [record] = await db.insert(traceabilityRecords).values(data).returning();
  return record;
}

export async function getTraceabilitySummary(clientId: number) {
  const records = await db.query.traceabilityRecords.findMany({
    where: eq(traceabilityRecords.clientId, clientId),
  });

  const totals = records.reduce(
    (acc, r) => ({
      recycling: acc.recycling + Number(r.recyclingKg || 0),
      compost: acc.compost + Number(r.compostKg || 0),
      reuse: acc.reuse + Number(r.reuseKg || 0),
      landfill: acc.landfill + Number(r.landfillKg || 0),
      treesSaved: acc.treesSaved + (r.treesSaved || 0),
      co2Avoided: acc.co2Avoided + Number(r.co2Avoided || 0),
      waterSaved: acc.waterSaved + (r.waterSaved || 0),
      revenue: acc.revenue + Number(r.monthlyRevenue || 0),
    }),
    { recycling: 0, compost: 0, reuse: 0, landfill: 0, treesSaved: 0, co2Avoided: 0, waterSaved: 0, revenue: 0 }
  );

  const totalManaged = totals.recycling + totals.compost + totals.reuse + totals.landfill;
  const diversionRate = totalManaged > 0
    ? ((totals.recycling + totals.compost + totals.reuse) / totalManaged) * 100
    : 0;

  return { ...totals, totalManaged, diversionRate, periods: records.length };
}

// --- Reports ---

export async function getClientReports(clientId?: number) {
  if (clientId) {
    return db.query.clientReports.findMany({
      where: eq(clientReports.clientId, clientId),
      orderBy: [desc(clientReports.period)],
    });
  }
  return db.query.clientReports.findMany({
    orderBy: [desc(clientReports.period)],
  });
}

export async function getPendingReports() {
  return db.query.clientReports.findMany({
    where: eq(clientReports.status, "pendiente"),
  });
}

export async function createClientReport(data: any) {
  const [report] = await db.insert(clientReports).values(data).returning();
  return report;
}

export async function updateReportStatus(id: number, status: string) {
  const updates: any = { status, updatedAt: new Date() };
  if (status === "enviado") updates.sentDate = new Date();
  if (status === "confirmado") updates.confirmedDate = new Date();

  const [updated] = await db
    .update(clientReports)
    .set(updates)
    .where(eq(clientReports.id, id))
    .returning();
  return updated;
}

// --- Economic Models ---

export async function getEconomicModels(clientId?: number) {
  if (clientId) {
    return db.query.economicModels.findMany({
      where: eq(economicModels.clientId, clientId),
      orderBy: [desc(economicModels.createdAt)],
    });
  }
  return db.query.economicModels.findMany({
    orderBy: [desc(economicModels.createdAt)],
  });
}

export async function getEconomicModelById(id: number) {
  return db.query.economicModels.findFirst({
    where: eq(economicModels.id, id),
  });
}

export async function createEconomicModel(data: any) {
  const [model] = await db.insert(economicModels).values(data).returning();
  return model;
}

export async function updateEconomicModel(id: number, data: any) {
  const [updated] = await db
    .update(economicModels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// --- Conciliation ---

export async function getConciliations(clientId?: number) {
  if (clientId) {
    return db.query.serviceConciliations.findMany({
      where: eq(serviceConciliations.clientId, clientId),
      orderBy: [desc(serviceConciliations.period)],
    });
  }
  return db.query.serviceConciliations.findMany({
    orderBy: [desc(serviceConciliations.period)],
  });
}

export async function createConciliation(data: any) {
  const [record] = await db.insert(serviceConciliations).values(data).returning();
  return record;
}

// --- Global summary ---

export async function getSubproductosSummary() {
  const [clientCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceClients)
    .where(eq(serviceClients.isActive, true));

  const [pendingReports] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clientReports)
    .where(eq(clientReports.status, "pendiente"));

  const [totalRevenue] = await db
    .select({
      total: sql<string>`coalesce(sum(${traceabilityRecords.monthlyRevenue}), 0)`,
    })
    .from(traceabilityRecords);

  return {
    activeClients: clientCount.count,
    pendingReports: pendingReports.count,
    totalRevenue: totalRevenue.total,
  };
}

import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { surveyVersions } from "../../../shared/schema/operaciones";
import {
  clientReports,
  type EconomicModel,
  economicModels,
  type InsertServiceClient,
  serviceClients,
  serviceConciliations,
  traceabilityRecords,
} from "../../../shared/schema/subproductos";
import { db } from "../../db";

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
  // Upsert on (clientId, period): re-submitting the same period updates that
  // record instead of inserting a duplicate that would double the totals (H14).
  const [record] = await db
    .insert(traceabilityRecords)
    .values(data)
    .onConflictDoUpdate({
      target: [traceabilityRecords.clientId, traceabilityRecords.period],
      set: data,
    })
    .returning();
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
    { recycling: 0, compost: 0, reuse: 0, landfill: 0, treesSaved: 0, co2Avoided: 0, waterSaved: 0, revenue: 0 },
  );

  const totalManaged = totals.recycling + totals.compost + totals.reuse + totals.landfill;
  const diversionRate =
    totalManaged > 0 ? ((totals.recycling + totals.compost + totals.reuse) / totalManaged) * 100 : 0;

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

  const [updated] = await db.update(clientReports).set(updates).where(eq(clientReports.id, id)).returning();
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

// --- Bandeja de Cotización ---

// Llamado por operaciones/approveSurvey cuando Luis aprueba un levantamiento.
// Idempotente: un economicModel por surveyId. Si ya existe (reapertura), no pisa
// el trabajo del equipo: actualiza el puntero de versión y prende needsReview.
export async function createCotizacionFromApprovedSurvey(params: {
  surveyId: number;
  surveyVersionId: number;
  clientName: string;
}) {
  const existing = await db.query.economicModels.findFirst({
    where: eq(economicModels.surveyId, params.surveyId),
  });

  if (existing) {
    const [updated] = await db
      .update(economicModels)
      .set({
        surveyVersionId: params.surveyVersionId,
        needsReview: true,
        updatedAt: new Date(),
      })
      .where(eq(economicModels.id, existing.id))
      .returning();
    console.warn(
      `[subproductos] Cotización ${existing.id} marcada needsReview (levantamiento ${params.surveyId} re-aprobado)`,
    );
    return updated;
  }

  const [created] = await db
    .insert(economicModels)
    .values({
      surveyId: params.surveyId,
      surveyVersionId: params.surveyVersionId,
      prospectName: params.clientName,
      title: `Cotización — ${params.clientName}`,
      status: "recibido",
      receivedAt: new Date(),
    })
    .returning();
  console.log(`[subproductos] Cotización ${created.id} creada desde levantamiento ${params.surveyId}`);
  return created;
}

// Bandeja: todas las cotizaciones (opcional filtro por estado), más recientes primero.
export async function getCotizaciones(status?: string) {
  return db.query.economicModels.findMany({
    where: status ? eq(economicModels.status, status as EconomicModel["status"]) : isNotNull(economicModels.surveyId),
    orderBy: [desc(economicModels.receivedAt)],
  });
}

export async function getCotizacionById(id: number) {
  const cot = await db.query.economicModels.findFirst({ where: eq(economicModels.id, id) });
  if (!cot) return null;
  if (!cot.surveyVersionId) return cot;
  const version = await db.query.surveyVersions.findFirst({
    where: eq(surveyVersions.id, cot.surveyVersionId),
    columns: { snapshot: true },
  });
  return { ...cot, snapshot: version?.snapshot ?? null };
}

// Tomar: recibido → en_cotizacion. Asigna responsable y arranca el sub-cronómetro.
export async function takeCotizacion(id: number, userId: number) {
  const [updated] = await db
    .update(economicModels)
    .set({ status: "en_cotizacion", assignedToId: userId, startedAt: new Date(), updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// Guardar campos del modelo económico (precio, costo, margen, composición…).
export async function updateCotizacion(id: number, data: Record<string, unknown>) {
  const [updated] = await db
    .update(economicModels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// Enviar a VoBo: en_cotizacion → en_vobo.
export async function submitCotizacionToVobo(id: number) {
  const [updated] = await db
    .update(economicModels)
    .set({ status: "en_vobo", submittedToVoboAt: new Date(), updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// Resolver VoBo: aprobar (→aprobado, sella resolvedAt) o rechazar (→en_cotizacion con motivo).
export async function resolveCotizacionVobo(
  id: number,
  userId: number,
  decision: "aprobar" | "rechazar",
  rejectionReason?: string,
) {
  const set =
    decision === "aprobar"
      ? { status: "aprobado" as const, voboById: userId, resolvedAt: new Date(), updatedAt: new Date() }
      : {
          status: "en_cotizacion" as const,
          voboById: userId,
          rejectionReason: rejectionReason ?? null,
          updatedAt: new Date(),
        };
  const [updated] = await db.update(economicModels).set(set).where(eq(economicModels.id, id)).returning();
  return updated;
}

// KPI: conteo por estado + tiempo promedio recibido→aprobado (días).
export async function getCotizacionKpis() {
  const rows = await db.query.economicModels.findMany({ where: isNotNull(economicModels.surveyId) });
  const byStatus: Record<string, number> = {};
  let totalDays = 0;
  let resolvedCount = 0;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.status === "aprobado" && r.receivedAt && r.resolvedAt) {
      totalDays += (r.resolvedAt.getTime() - r.receivedAt.getTime()) / 86_400_000;
      resolvedCount += 1;
    }
  }
  return {
    byStatus,
    avgDaysToApprove: resolvedCount > 0 ? totalDays / resolvedCount : null,
    pendingReception: byStatus["recibido"] || 0,
  };
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

  // Only count revenue from active clients so it matches activeClients (H25 —
  // before it summed every record, including clients that were deactivated).
  const [totalRevenue] = await db
    .select({
      total: sql<string>`coalesce(sum(${traceabilityRecords.monthlyRevenue}), 0)`,
    })
    .from(traceabilityRecords)
    .innerJoin(serviceClients, eq(traceabilityRecords.clientId, serviceClients.id))
    .where(eq(serviceClients.isActive, true));

  return {
    activeClients: clientCount.count,
    pendingReports: pendingReports.count,
    totalRevenue: totalRevenue.total,
  };
}

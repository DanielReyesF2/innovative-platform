import { db } from "../../db";
import { eq, desc, and, sql, gte, lte, isNull, or } from "drizzle-orm";
import {
  prospects,
  leads,
  rejectionReasons,
  salesMetrics,
  pipelineSnapshots,
  prospectActivities,
  prospectNotes,
  prospectMeetings,
  prospectDocuments,
  proposalVersions,
  followUpAlerts,
  ventasReales,
  kpisMensuales,
  type InsertProspect,
  type InsertLead,
  type InsertActivity,
  type InsertNote,
  type InsertMeeting,
  type InsertProspectDocument,
  type InsertProposal,
  type InsertAlert,
  type InsertVentaReal,
  type InsertKpiMensual,
  comercialWeeklyReports,
  weeklyCommitments,
} from "../../../shared/schema/comercial";
import {
  surveys,
  surveyWasteTypes,
  surveyCurrentServices,
} from "../../../shared/schema/operaciones";
import { users } from "../../../shared/schema/common";

// Drizzle pgEnum columns expect the exact union type, but runtime values are strings.
// This helper casts safely to avoid `as any` while keeping TypeScript happy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enumCast = <T>(value: string): T => value as unknown as T;
type ProspectStage = (typeof prospects.stage)["_"]["data"];
type AlertStatus = (typeof followUpAlerts.status)["_"]["data"];
type Priority = (typeof prospects.priority)["_"]["data"];
type ProposalStatus = (typeof proposalVersions.status)["_"]["data"];

// --- Prospects ---

export async function getProspects() {
  const rows = await db
    .select({
      prospect: prospects,
      rejectionReasonText: rejectionReasons.reason,
      rejectionReasonCategory: rejectionReasons.category,
    })
    .from(prospects)
    .leftJoin(rejectionReasons, eq(prospects.rejectionReasonId, rejectionReasons.id))
    .orderBy(desc(prospects.updatedAt));

  return rows.map((r) => ({
    ...r.prospect,
    rejectionReasonText: r.rejectionReasonText,
    rejectionReasonCategory: r.rejectionReasonCategory,
  }));
}

export async function getProspectById(id: number) {
  return db.query.prospects.findFirst({
    where: eq(prospects.id, id),
  });
}

export async function getProspectsByStage(stage: string) {
  return db.query.prospects.findMany({
    where: eq(prospects.stage, enumCast<ProspectStage>(stage)),
    orderBy: [desc(prospects.probability)],
  });
}

export async function createProspect(data: InsertProspect) {
  const [prospect] = await db.insert(prospects).values(data).returning();
  return prospect;
}

export async function deleteProspect(id: number) {
  return db.transaction(async (tx) => {
    // Delete related records first
    await tx.delete(prospectActivities).where(eq(prospectActivities.prospectId, id));
    await tx.delete(prospectNotes).where(eq(prospectNotes.prospectId, id));
    await tx.delete(prospectMeetings).where(eq(prospectMeetings.prospectId, id));
    await tx.delete(prospectDocuments).where(eq(prospectDocuments.prospectId, id));
    await tx.delete(proposalVersions).where(eq(proposalVersions.prospectId, id));
    await tx.delete(followUpAlerts).where(eq(followUpAlerts.prospectId, id));
    // Clear FK from leads that were converted to this prospect
    await tx.update(leads).set({ convertedToProspectId: null }).where(eq(leads.convertedToProspectId, id));
    const [deleted] = await tx.delete(prospects).where(eq(prospects.id, id)).returning();
    return deleted;
  });
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
      stage: "cierre_perdido",
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

// --- Qualify Lead → Prospecto ---

export async function qualifyProspect(id: number, data: {
  industry: string;
  potential: string;
  estimatedValue?: string | number;
  estimatedVolume?: string;
  probability: number;
  priority: string;
  contactRole?: string;
  contactEmail?: string;
  reason?: string;
  nextStep?: string;
}) {
  // Verify prospect exists and is in 'lead' stage
  const prospect = await db.query.prospects.findFirst({
    where: eq(prospects.id, id),
  });
  if (!prospect) throw new Error("NOT_FOUND");
  if (prospect.stage !== "lead") {
    throw new Error("CONFLICT:El prospecto no esta en etapa 'lead'");
  }

  const [updated] = await db
    .update(prospects)
    .set({
      stage: "prospecto",
      industry: data.industry,
      potential: data.potential,
      estimatedValue: data.estimatedValue ? String(data.estimatedValue) : null,
      estimatedVolume: data.estimatedVolume || null,
      probability: data.probability,
      priority: enumCast<Priority>(data.priority || "media"),
      contactRole: data.contactRole || null,
      contactEmail: data.contactEmail || null,
      reason: data.reason || null,
      nextStep: data.nextStep || null,
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

export async function convertLeadToProspect(
  leadId: number,
  qualifyData: {
    industry?: string;
    location?: string;
    potential?: string;
    estimatedValue?: string;
    estimatedVolume?: string;
    wasteInfo?: {
      wasteTypes: string[];
      estimatedVolume: string;
      hasCurrentProvider: boolean;
      currentProviderName?: string;
      reasonForChange?: string;
    };
  }
) {
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) throw new Error("NOT_FOUND");
  if (!lead.isActive) throw new Error("CONFLICT:Este lead ya fue convertido");

  const result = await db.transaction(async (tx) => {
    // Create prospect from lead data
    const [prospect] = await tx
      .insert(prospects)
      .values({
        name: lead.companyName,
        contactName: lead.contactName,
        contactRole: lead.contactRole || null,
        contactPhone: lead.contactPhone || null,
        contactEmail: lead.contactEmail || null,
        industry: qualifyData.industry || null,
        location: qualifyData.location || null,
        potential: qualifyData.potential || null,
        estimatedValue: qualifyData.estimatedValue || null,
        estimatedVolume: qualifyData.estimatedVolume || null,
        levantamientoData: qualifyData.wasteInfo
          ? { qualificationWaste: qualifyData.wasteInfo }
          : null,
        stage: "contacto_inicial",
        probability: 10,
        priority: "media",
      })
      .returning();

    // Mark lead as converted
    const [updatedLead] = await tx
      .update(leads)
      .set({ convertedToProspectId: prospect.id, isActive: false })
      .where(eq(leads.id, leadId))
      .returning();

    return { prospect, lead: updatedLead };
  });

  return result;
}

// --- Rejection Reasons ---

export async function getRejectionReasons() {
  return db.query.rejectionReasons.findMany({
    where: eq(rejectionReasons.isActive, true),
  });
}

// --- Pipeline ---

export async function getPipelineSummary() {
  // New stages + legacy equivalents grouped together
  const stageGroups = [
    { key: "contacto_inicial", values: ["contacto_inicial", "lead"] },
    { key: "presentacion", values: ["presentacion"] },
    { key: "levantamiento", values: ["levantamiento"] },
    { key: "propuesta", values: ["propuesta"] },
    { key: "negociacion", values: ["negociacion"] },
    { key: "cierre_ganado", values: ["cierre_ganado", "cierre"] },
  ];
  const results = [];

  for (const group of stageGroups) {
    const conditions = group.values.map((v) => eq(prospects.stage, enumCast<ProspectStage>(v)));
    const [row] = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalValue: sql<string>`coalesce(sum(${prospects.estimatedValue}), 0)`,
      })
      .from(prospects)
      .where(or(...conditions));

    results.push({
      stage: group.key,
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

  // State guard: only early stages can be sent
  const allowedStages = ["lead", "contacto_inicial", "presentacion", "levantamiento"];
  if (!allowedStages.includes(prospect.stage)) {
    throw new Error("CONFLICT:El prospecto ya paso la etapa de levantamiento");
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
  // DEBT: levantamientoData is JSONB with dynamic structure from the levantamiento form.
  // Proper fix: define a LevantamientoData interface matching the form schema.
  // For now, typed as Record to avoid `as any` while keeping indexability.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const levData = prospect.levantamientoData as Record<string, any> | null;
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
        generalInfo: {
          ...levData.generalInfo,
          proposedScheduling: levData.scheduling || null,
        },
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

// === CRM ENHANCEMENT FUNCTIONS ===

// --- Activities (Timeline) ---

export async function getProspectActivities(prospectId: number) {
  return db.query.prospectActivities.findMany({
    where: eq(prospectActivities.prospectId, prospectId),
    orderBy: [desc(prospectActivities.createdAt)],
  });
}

export async function createActivity(data: InsertActivity) {
  const [activity] = await db.insert(prospectActivities).values(data).returning();

  // Update prospect's lastContactAt
  if (["llamada", "email", "reunion"].includes(data.type)) {
    await db
      .update(prospects)
      .set({ lastContactAt: new Date(), updatedAt: new Date() })
      .where(eq(prospects.id, data.prospectId));
  }

  return activity;
}

// --- Notes ---

export async function getProspectNotes(prospectId: number) {
  return db.query.prospectNotes.findMany({
    where: eq(prospectNotes.prospectId, prospectId),
    orderBy: [desc(prospectNotes.isPinned), desc(prospectNotes.createdAt)],
  });
}

export async function createNote(prospectId: number, content: string, createdById: number) {
  const [note] = await db
    .insert(prospectNotes)
    .values({ prospectId, content, createdById })
    .returning();

  // Log activity
  await createActivity({
    prospectId,
    type: "nota",
    title: "Nota agregada",
    description: content.substring(0, 100),
    createdById,
  });

  return note;
}

export async function updateNote(id: number, content: string) {
  const [updated] = await db
    .update(prospectNotes)
    .set({ content, updatedAt: new Date() })
    .where(eq(prospectNotes.id, id))
    .returning();
  return updated;
}

export async function deleteNote(id: number) {
  await db.delete(prospectNotes).where(eq(prospectNotes.id, id));
}

export async function toggleNotePin(id: number) {
  const note = await db.query.prospectNotes.findFirst({ where: eq(prospectNotes.id, id) });
  if (!note) return null;

  const [updated] = await db
    .update(prospectNotes)
    .set({ isPinned: !note.isPinned })
    .where(eq(prospectNotes.id, id))
    .returning();
  return updated;
}

// --- Meetings ---

export async function getProspectMeetings(prospectId: number) {
  return db.query.prospectMeetings.findMany({
    where: eq(prospectMeetings.prospectId, prospectId),
    orderBy: [desc(prospectMeetings.scheduledAt)],
  });
}

export async function createMeeting(data: InsertMeeting) {
  const [meeting] = await db.insert(prospectMeetings).values(data).returning();

  // Log activity
  await createActivity({
    prospectId: data.prospectId,
    type: "reunion",
    title: `Reunion programada: ${data.title}`,
    createdById: data.createdById,
  });

  return meeting;
}

export async function completeMeeting(id: number, outcome: string) {
  const [updated] = await db
    .update(prospectMeetings)
    .set({ status: "completada", outcome, completedAt: new Date(), updatedAt: new Date() })
    .where(eq(prospectMeetings.id, id))
    .returning();
  return updated;
}

export async function cancelMeeting(id: number) {
  const [updated] = await db
    .update(prospectMeetings)
    .set({ status: "cancelada", updatedAt: new Date() })
    .where(eq(prospectMeetings.id, id))
    .returning();
  return updated;
}

// --- Documents ---

export async function getProspectDocuments(prospectId: number) {
  return db.query.prospectDocuments.findMany({
    where: eq(prospectDocuments.prospectId, prospectId),
    orderBy: [desc(prospectDocuments.createdAt)],
  });
}

export async function createDocument(data: InsertProspectDocument) {
  const [doc] = await db.insert(prospectDocuments).values(data).returning();

  // Log activity
  await createActivity({
    prospectId: data.prospectId,
    type: "documento",
    title: `Documento agregado: ${data.name}`,
    createdById: data.uploadedById,
  });

  return doc;
}

export async function deleteDocument(id: number) {
  await db.delete(prospectDocuments).where(eq(prospectDocuments.id, id));
}

// --- Proposals ---

export async function getProposalVersions(prospectId: number) {
  return db.query.proposalVersions.findMany({
    where: eq(proposalVersions.prospectId, prospectId),
    orderBy: [desc(proposalVersions.version)],
  });
}

export async function createProposal(data: InsertProposal) {
  // Get next version number
  const existing = await db.query.proposalVersions.findMany({
    where: eq(proposalVersions.prospectId, data.prospectId),
  });
  const nextVersion = existing.length + 1;

  const [proposal] = await db
    .insert(proposalVersions)
    .values({ ...data, version: nextVersion })
    .returning();

  // Log activity
  await createActivity({
    prospectId: data.prospectId,
    type: "propuesta",
    title: `Propuesta v${nextVersion} creada`,
    createdById: data.createdById,
  });

  return proposal;
}

export async function sendProposal(id: number, sentById: number) {
  const [updated] = await db
    .update(proposalVersions)
    .set({ status: "enviada", sentAt: new Date(), sentById, updatedAt: new Date() })
    .where(eq(proposalVersions.id, id))
    .returning();
  return updated;
}

export async function changeProposalStatus(id: number, status: string) {
  const [updated] = await db
    .update(proposalVersions)
    .set({ status: enumCast<ProposalStatus>(status), updatedAt: new Date() })
    .where(eq(proposalVersions.id, id))
    .returning();
  return updated;
}

// --- Alerts ---

export async function getAlerts(status?: string, assignedToId?: number) {
  const conditions = [];
  if (status) conditions.push(eq(followUpAlerts.status, enumCast<AlertStatus>(status)));
  if (assignedToId) conditions.push(eq(followUpAlerts.assignedToId, assignedToId));

  return db.query.followUpAlerts.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(followUpAlerts.createdAt)],
  });
}

export async function getPendingAlertsCount(assignedToId?: number) {
  const conditions = [eq(followUpAlerts.status, "pending")];
  if (assignedToId) conditions.push(eq(followUpAlerts.assignedToId, assignedToId));

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(followUpAlerts)
    .where(and(...conditions));

  return result.count;
}

export async function acknowledgeAlert(id: number, userId: number) {
  const [updated] = await db
    .update(followUpAlerts)
    .set({ status: "acknowledged", acknowledgedAt: new Date(), acknowledgedById: userId })
    .where(eq(followUpAlerts.id, id))
    .returning();
  return updated;
}

export async function dismissAlert(id: number) {
  const [updated] = await db
    .update(followUpAlerts)
    .set({ status: "dismissed" })
    .where(eq(followUpAlerts.id, id))
    .returning();
  return updated;
}

export async function generateAlerts() {
  const alerts: InsertAlert[] = [];
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find prospects with overdue follow-ups
  const activeStages = ["contacto_inicial", "presentacion", "lead", "levantamiento", "propuesta", "negociacion"];
  const overdueProspects = await db.query.prospects.findMany({
    where: and(
      lte(prospects.nextFollowUpAt, now),
      or(...activeStages.map((s) => eq(prospects.stage, enumCast<ProspectStage>(s))))
    ),
  });

  for (const p of overdueProspects) {
    // Check if alert already exists
    const existing = await db.query.followUpAlerts.findFirst({
      where: and(
        eq(followUpAlerts.prospectId, p.id),
        eq(followUpAlerts.alertType, "overdue_follow_up"),
        eq(followUpAlerts.status, "pending")
      ),
    });

    if (!existing) {
      alerts.push({
        prospectId: p.id,
        alertType: "overdue_follow_up",
        title: `Seguimiento vencido: ${p.name}`,
        message: `El seguimiento estaba programado para ${p.nextFollowUpAt?.toLocaleDateString()}`,
        priority: "alta",
        dueDate: p.nextFollowUpAt,
        assignedToId: p.assignedToId,
      });
    }
  }

  // Find stale prospects (no contact in 7 days)
  const staleProspects = await db.query.prospects.findMany({
    where: and(
      or(isNull(prospects.lastContactAt), lte(prospects.lastContactAt, sevenDaysAgo)),
      or(...activeStages.map((s) => eq(prospects.stage, enumCast<ProspectStage>(s))))
    ),
  });

  for (const p of staleProspects) {
    const existing = await db.query.followUpAlerts.findFirst({
      where: and(
        eq(followUpAlerts.prospectId, p.id),
        eq(followUpAlerts.alertType, "stale_prospect"),
        eq(followUpAlerts.status, "pending")
      ),
    });

    if (!existing) {
      alerts.push({
        prospectId: p.id,
        alertType: "stale_prospect",
        title: `Prospecto sin actividad: ${p.name}`,
        message: "No ha habido contacto en los ultimos 7 dias",
        priority: "media",
        assignedToId: p.assignedToId,
      });
    }
  }

  // Insert all new alerts
  if (alerts.length > 0) {
    await db.insert(followUpAlerts).values(alerts);
  }

  return { generated: alerts.length };
}

// --- Reports ---

export async function getLeadSourcesReport() {
  const results = await db
    .select({
      source: leads.source,
      totalLeads: sql<number>`count(*)::int`,
      convertedLeads: sql<number>`count(${leads.convertedToProspectId})::int`,
    })
    .from(leads)
    .groupBy(leads.source);

  return results.map((r) => ({
    ...r,
    conversionRate: r.totalLeads > 0 ? (r.convertedLeads / r.totalLeads) * 100 : 0,
  }));
}

export async function getSalesForecast() {
  const results = await db
    .select({
      month: sql<string>`to_char(${prospects.proposalDate}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
      totalValue: sql<string>`coalesce(sum(${prospects.estimatedValue}), 0)`,
      weightedValue: sql<string>`coalesce(sum(${prospects.estimatedValue} * ${prospects.probability} / 100), 0)`,
    })
    .from(prospects)
    .where(
      and(
        or(
          eq(prospects.stage, "propuesta"),
          eq(prospects.stage, "negociacion")
        )
      )
    )
    .groupBy(sql`to_char(${prospects.proposalDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${prospects.proposalDate}, 'YYYY-MM')`);

  return results;
}

export async function getWinLossAnalysis() {
  const wins = await db
    .select({
      reason: prospects.opportunity,
      count: sql<number>`count(*)::int`,
    })
    .from(prospects)
    .where(or(eq(prospects.stage, "cierre_ganado"), eq(prospects.stage, "cierre")))
    .groupBy(prospects.opportunity);

  const losses = await db
    .select({
      reason: rejectionReasons.reason,
      count: sql<number>`count(*)::int`,
    })
    .from(prospects)
    .leftJoin(rejectionReasons, eq(prospects.rejectionReasonId, rejectionReasons.id))
    .where(or(eq(prospects.stage, "cierre_perdido"), eq(prospects.stage, "rechazada")))
    .groupBy(rejectionReasons.reason);

  const totalWins = wins.reduce((sum, w) => sum + w.count, 0);
  const totalLosses = losses.reduce((sum, l) => sum + l.count, 0);
  const total = totalWins + totalLosses;

  return {
    wins,
    losses,
    winRate: total > 0 ? (totalWins / total) * 100 : 0,
  };
}

export async function getCompetitorAnalysis() {
  // Get prospects with competitors
  const prospectsWithCompetitors = await db.query.prospects.findMany({
    where: sql`${prospects.competitors} is not null and array_length(${prospects.competitors}, 1) > 0`,
  });

  const competitorStats: Record<string, { mentions: number; wins: number; losses: number }> = {};

  for (const p of prospectsWithCompetitors) {
    const comps = p.competitors || [];
    for (const comp of comps) {
      if (!competitorStats[comp]) {
        competitorStats[comp] = { mentions: 0, wins: 0, losses: 0 };
      }
      competitorStats[comp].mentions++;
      if (["cierre", "cierre_ganado"].includes(p.stage)) competitorStats[comp].wins++;
      if (["rechazada", "cierre_perdido"].includes(p.stage)) competitorStats[comp].losses++;
    }
  }

  return Object.entries(competitorStats).map(([competitor, stats]) => ({
    competitor,
    ...stats,
    winRate: stats.wins + stats.losses > 0
      ? (stats.wins / (stats.wins + stats.losses)) * 100
      : 0,
  }));
}

// === POST-REUNION VERO FUNCTIONS (Feb 2026) ===

// --- Ventas Reales ---

export async function getVentasReales(año?: number) {
  if (año) {
    return db.query.ventasReales.findMany({
      where: eq(ventasReales.año, año),
      orderBy: [desc(ventasReales.mes)],
    });
  }
  return db.query.ventasReales.findMany({
    orderBy: [desc(ventasReales.año), desc(ventasReales.mes)],
  });
}

export async function getVentasRealesByUser(userId: number, año?: number) {
  const conditions = [eq(ventasReales.userId, userId)];
  if (año) conditions.push(eq(ventasReales.año, año));

  return db.query.ventasReales.findMany({
    where: and(...conditions),
    orderBy: [desc(ventasReales.año), desc(ventasReales.mes)],
  });
}

export async function getVentaReal(userId: number, mes: number, año: number) {
  return db.query.ventasReales.findFirst({
    where: and(
      eq(ventasReales.userId, userId),
      eq(ventasReales.mes, mes),
      eq(ventasReales.año, año)
    ),
  });
}

export async function createOrUpdateVentaReal(data: InsertVentaReal) {
  // Check if exists
  const existing = await getVentaReal(data.userId, data.mes, data.año);

  if (existing) {
    const [updated] = await db
      .update(ventasReales)
      .set({ monto: String(data.monto), updatedAt: new Date() })
      .where(eq(ventasReales.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(ventasReales)
    .values({ ...data, monto: String(data.monto) })
    .returning();
  return created;
}

// --- KPIs Mensuales ---

export async function getKpisMensuales(año?: number) {
  if (año) {
    return db.query.kpisMensuales.findMany({
      where: eq(kpisMensuales.año, año),
      orderBy: [desc(kpisMensuales.mes)],
    });
  }
  return db.query.kpisMensuales.findMany({
    orderBy: [desc(kpisMensuales.año), desc(kpisMensuales.mes)],
  });
}

export async function getKpisMensualesByUser(userId: number, año?: number) {
  const conditions = [eq(kpisMensuales.userId, userId)];
  if (año) conditions.push(eq(kpisMensuales.año, año));

  return db.query.kpisMensuales.findMany({
    where: and(...conditions),
    orderBy: [desc(kpisMensuales.año), desc(kpisMensuales.mes)],
  });
}

export async function getKpiMensual(userId: number, mes: number, año: number) {
  return db.query.kpisMensuales.findFirst({
    where: and(
      eq(kpisMensuales.userId, userId),
      eq(kpisMensuales.mes, mes),
      eq(kpisMensuales.año, año)
    ),
  });
}

export async function createOrUpdateKpiMensual(data: InsertKpiMensual) {
  const existing = await getKpiMensual(data.userId, data.mes, data.año);

  if (existing) {
    const [updated] = await db
      .update(kpisMensuales)
      .set({
        leads: data.leads,
        prospectos: data.prospectos,
        reuniones: data.reuniones,
        levantamientos: data.levantamientos,
        propuestas: data.propuestas,
        cierres: data.cierres,
      })
      .where(eq(kpisMensuales.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(kpisMensuales).values(data).returning();
  return created;
}

// --- Rejected Prospects with Contract Expiration ---

export async function getRechazadasConVencimiento() {
  return db.query.prospects.findMany({
    where: and(
      or(eq(prospects.stage, "rechazada"), eq(prospects.stage, "cierre_perdido")),
      sql`${prospects.fechaVencimientoContrato} is not null`
    ),
    orderBy: [prospects.fechaVencimientoContrato],
  });
}

export async function getRechazadasProximasAVencer(diasAnticipacion: number = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

  return db.query.prospects.findMany({
    where: and(
      or(eq(prospects.stage, "rechazada"), eq(prospects.stage, "cierre_perdido")),
      sql`${prospects.fechaVencimientoContrato} is not null`,
      lte(prospects.fechaVencimientoContrato, fechaLimite)
    ),
    orderBy: [prospects.fechaVencimientoContrato],
  });
}

// --- Comercial Team (replaces hardcoded salesTeamData) ---

export async function getComercialTeam() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get only active comercial/director users (not admin accounts)
  const allUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });
  const comercialUsers = allUsers.filter(
    u => u.codigo && (u.role === "comercial" || u.role === "director")
  );

  // Get current month sales metrics
  const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const metricsRows = await db.query.salesMetrics.findMany({
    where: eq(salesMetrics.period, currentPeriod),
  });
  const metricsMap = new Map(metricsRows.map(m => [m.userId, m]));

  // Get ALL months of current year for annual budget + per-month budgets
  const allYearMetrics = await db.query.salesMetrics.findMany();
  const yearPrefix = `${currentYear}-`;
  const annualBudgetMap = new Map<number, number>();
  const monthlyBudgetsMap = new Map<number, Record<string, number>>();
  for (const m of allYearMetrics) {
    if (m.period.startsWith(yearPrefix)) {
      const budget = Number(m.monthlyBudget) || 0;
      annualBudgetMap.set(m.userId, (annualBudgetMap.get(m.userId) || 0) + budget);
      const userBudgets = monthlyBudgetsMap.get(m.userId) || {};
      userBudgets[m.period] = budget;
      monthlyBudgetsMap.set(m.userId, userBudgets);
    }
  }

  // Get current month ventas reales
  const ventasRows = await db.query.ventasReales.findMany({
    where: and(
      eq(ventasReales.mes, currentMonth),
      eq(ventasReales.año, currentYear),
    ),
  });
  const ventasMap = new Map(ventasRows.map(v => [v.userId, Number(v.monto)]));

  // Get ALL months of current year for annual ventas sum
  const ventasAnualRows = await db.query.ventasReales.findMany({
    where: eq(ventasReales.año, currentYear),
  });
  const ventasAnualMap = new Map<number, number>();
  for (const v of ventasAnualRows) {
    ventasAnualMap.set(v.userId, (ventasAnualMap.get(v.userId) || 0) + Number(v.monto));
  }

  return comercialUsers.map(u => {
    const metrics = metricsMap.get(u.id);
    const monthlyBudget = metrics ? Number(metrics.monthlyBudget) || 0 : 0;
    const ventaReal = ventasMap.get(u.id) || 0;
    const annualBudget = annualBudgetMap.get(u.id) || 0;
    return {
      id: u.id,
      codigo: u.codigo,
      name: u.name,
      email: u.email,
      role: u.role,
      presupuestoMensual: monthlyBudget,
      presupuestoAnual: annualBudget,
      presupuestosMensuales: monthlyBudgetsMap.get(u.id) || {},
      ventasReales: ventaReal,
      ventasRealesAnual: ventasAnualMap.get(u.id) || 0,
    };
  });
}

// --- Editable Budgets ---

export async function upsertSalesMetric(userId: number, period: string, monthlyBudget: number) {
  const existing = await db.query.salesMetrics.findFirst({
    where: and(eq(salesMetrics.userId, userId), eq(salesMetrics.period, period)),
  });
  if (existing) {
    const [updated] = await db
      .update(salesMetrics)
      .set({ monthlyBudget: String(monthlyBudget) })
      .where(and(eq(salesMetrics.userId, userId), eq(salesMetrics.period, period)))
      .returning();
    return updated;
  }
  const [inserted] = await db
    .insert(salesMetrics)
    .values({ userId, period, monthlyBudget: String(monthlyBudget) })
    .returning();
  return inserted;
}

// === RESUMEN SEMANAL (Weekly Management Report) ===

export async function getWeeklyReport(userId: number, weekStart: string) {
  return db.query.comercialWeeklyReports.findFirst({
    where: and(
      eq(comercialWeeklyReports.createdById, userId),
      eq(comercialWeeklyReports.weekStart, weekStart),
    ),
  });
}

export async function upsertWeeklyReport(
  userId: number,
  weekStart: string,
  content: string,
  status: string = "draft",
  meetingNotes?: string,
) {
  const existing = await getWeeklyReport(userId, weekStart);

  if (existing) {
    const updates: Record<string, unknown> = { content, status, updatedAt: new Date() };
    if (meetingNotes !== undefined) updates.meetingNotes = meetingNotes;
    const [updated] = await db
      .update(comercialWeeklyReports)
      .set(updates)
      .where(eq(comercialWeeklyReports.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(comercialWeeklyReports)
    .values({ weekStart, content, meetingNotes: meetingNotes || "", status, createdById: userId })
    .returning();
  return created;
}

export async function markWeeklyReportAsSent(reportId: number, recipients: string) {
  const [updated] = await db
    .update(comercialWeeklyReports)
    .set({ status: "sent", sentAt: new Date(), recipients, updatedAt: new Date() })
    .where(eq(comercialWeeklyReports.id, reportId))
    .returning();
  return updated;
}

// --- Weekly Reports Range (for calendar view) ---

export async function getWeeklyReportsInRange(userId: number, from: string, to: string) {
  return db.query.comercialWeeklyReports.findMany({
    where: and(
      eq(comercialWeeklyReports.createdById, userId),
      gte(comercialWeeklyReports.weekStart, from),
      lte(comercialWeeklyReports.weekStart, to),
    ),
    orderBy: [desc(comercialWeeklyReports.weekStart)],
  });
}

// --- Weekly Commitments ---

export async function getCommitmentsByWeek(userId: number, weekStart: string) {
  return db.query.weeklyCommitments.findMany({
    where: and(
      eq(weeklyCommitments.createdById, userId),
      eq(weeklyCommitments.weekStart, weekStart),
    ),
    orderBy: [desc(weeklyCommitments.createdAt)],
  });
}

export async function getPendingCommitments(userId: number) {
  return db.query.weeklyCommitments.findMany({
    where: and(
      eq(weeklyCommitments.createdById, userId),
      eq(weeklyCommitments.status, "pendiente"),
    ),
    orderBy: [desc(weeklyCommitments.createdAt)],
  });
}

export async function createCommitment(data: {
  weekStart: string;
  description: string;
  responsible: string;
  dueDate?: string | null;
  createdById: number;
}) {
  const [created] = await db
    .insert(weeklyCommitments)
    .values(data)
    .returning();
  return created;
}

export async function updateCommitmentStatus(id: number, status: "pendiente" | "cumplido") {
  const [updated] = await db
    .update(weeklyCommitments)
    .set({ status })
    .where(eq(weeklyCommitments.id, id))
    .returning();
  return updated;
}

export async function deleteCommitment(id: number) {
  const [deleted] = await db
    .delete(weeklyCommitments)
    .where(eq(weeklyCommitments.id, id))
    .returning();
  return deleted;
}

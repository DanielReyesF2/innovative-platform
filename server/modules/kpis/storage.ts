import { db } from "../../db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import {
  kpiCategories,
  kpis,
  kpiEntries,
  kpiActionPlans,
} from "../../../shared/schema/kpis";
import { areas } from "../../../shared/schema/common";

// --- Categories ---

export async function getKpiCategories() {
  return db.query.kpiCategories.findMany({
    orderBy: [kpiCategories.name],
  });
}

export async function createKpiCategory(data: {
  name: string;
  displayName: string;
  icon?: string | null;
  color?: string | null;
}) {
  const [category] = await db
    .insert(kpiCategories)
    .values({ ...data, isSystem: false })
    .returning();
  return category;
}

// --- KPIs ---

export async function getKpis(filters?: {
  categoryId?: number;
  status?: string;
  frequency?: string;
  ownerId?: number;
  areaId?: number;
}) {
  const conditions = [];

  if (filters?.categoryId) {
    conditions.push(eq(kpis.categoryId, filters.categoryId));
  }
  if (filters?.status) {
    conditions.push(eq(kpis.status, filters.status as any));
  }
  if (filters?.frequency) {
    conditions.push(eq(kpis.frequency, filters.frequency as any));
  }
  if (filters?.ownerId) {
    conditions.push(eq(kpis.ownerId, filters.ownerId));
  }
  if (filters?.areaId) {
    conditions.push(eq(kpis.areaId, filters.areaId));
  }

  const allKpis = await db
    .select()
    .from(kpis)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(kpis.displayOrder, kpis.name);

  // Attach last entry for each KPI
  const result = [];
  for (const kpi of allKpis) {
    const lastEntry = await db.query.kpiEntries.findFirst({
      where: eq(kpiEntries.kpiId, kpi.id),
      orderBy: [desc(kpiEntries.createdAt)],
    });

    const category = kpi.categoryId
      ? await db.query.kpiCategories.findFirst({
          where: eq(kpiCategories.id, kpi.categoryId),
        })
      : null;

    result.push({ ...kpi, lastEntry: lastEntry || null, category: category || null });
  }

  return result;
}

export async function getKpiById(id: number) {
  const kpi = await db.query.kpis.findFirst({
    where: eq(kpis.id, id),
  });
  if (!kpi) return null;

  const lastEntry = await db.query.kpiEntries.findFirst({
    where: eq(kpiEntries.kpiId, id),
    orderBy: [desc(kpiEntries.createdAt)],
  });

  const category = kpi.categoryId
    ? await db.query.kpiCategories.findFirst({
        where: eq(kpiCategories.id, kpi.categoryId),
      })
    : null;

  return { ...kpi, lastEntry: lastEntry || null, category: category || null };
}

export async function createKpi(data: Record<string, any>, createdById: number) {
  const [kpi] = await db
    .insert(kpis)
    .values({ ...data, createdById } as any)
    .returning();
  return kpi;
}

export async function updateKpi(id: number, data: Record<string, any>) {
  const [updated] = await db
    .update(kpis)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(kpis.id, id))
    .returning();
  return updated;
}

export async function archiveKpi(id: number) {
  const [updated] = await db
    .update(kpis)
    .set({ status: "archivado", updatedAt: new Date() })
    .where(eq(kpis.id, id))
    .returning();
  return updated;
}

// --- KPI Summary ---

export async function getKpiSummary(areaId?: number) {
  const conditions = [eq(kpis.status, "activo")];
  if (areaId) {
    conditions.push(eq(kpis.areaId, areaId));
  }

  const activeKpis = await db
    .select()
    .from(kpis)
    .where(and(...conditions));

  let total = activeKpis.length;
  let onTarget = 0;
  let atRisk = 0;
  let offTarget = 0;

  for (const kpi of activeKpis) {
    const lastEntry = await db.query.kpiEntries.findFirst({
      where: eq(kpiEntries.kpiId, kpi.id),
      orderBy: [desc(kpiEntries.createdAt)],
    });

    if (!lastEntry || !lastEntry.compliance) continue;

    const compliance = Number(lastEntry.compliance);
    if (compliance >= 90) {
      onTarget++;
    } else if (compliance >= 70) {
      atRisk++;
    } else {
      offTarget++;
    }
  }

  return { total, onTarget, atRisk, offTarget };
}

// --- KPI Entries ---

export async function getKpiEntries(kpiId: number, periodFilter?: string) {
  const conditions = [eq(kpiEntries.kpiId, kpiId)];

  if (periodFilter) {
    conditions.push(eq(kpiEntries.period, periodFilter));
  }

  return db
    .select()
    .from(kpiEntries)
    .where(and(...conditions))
    .orderBy(desc(kpiEntries.period));
}

export async function createKpiEntry(data: {
  kpiId: number;
  period: string;
  actualValue: string;
  notes?: string;
  recordedById: number;
}) {
  // Get the KPI to know target
  const kpi = await db.query.kpis.findFirst({
    where: eq(kpis.id, data.kpiId),
  });
  if (!kpi) throw new Error("KPI_NOT_FOUND");

  // Get previous entry for trend calculation
  const previousEntry = await db.query.kpiEntries.findFirst({
    where: eq(kpiEntries.kpiId, data.kpiId),
    orderBy: [desc(kpiEntries.createdAt)],
  });

  const actualValue = Number(data.actualValue);
  const targetValue = Number(kpi.targetValue || 0);
  const previousValue = previousEntry ? Number(previousEntry.actualValue) : null;

  // Auto-calculate compliance
  let compliance: number;
  if (targetValue === 0) {
    compliance = actualValue >= 0 ? 100 : 0;
  } else {
    compliance = (actualValue / targetValue) * 100;
  }

  // Auto-calculate trend
  let trend: "up" | "down" | "stable" = "stable";
  if (previousValue !== null) {
    const changePercent = previousValue !== 0
      ? ((actualValue - previousValue) / Math.abs(previousValue)) * 100
      : actualValue > 0 ? 100 : 0;

    if (changePercent > 1) trend = "up";
    else if (changePercent < -1) trend = "down";
  }

  const [entry] = await db
    .insert(kpiEntries)
    .values({
      kpiId: data.kpiId,
      period: data.period,
      actualValue: data.actualValue,
      targetValue: kpi.targetValue,
      previousValue: previousValue?.toString() || null,
      compliance: compliance.toFixed(2),
      trend,
      notes: data.notes,
      recordedById: data.recordedById,
    })
    .returning();

  return entry;
}

export async function updateKpiEntry(
  entryId: number,
  data: { actualValue?: string; notes?: string }
) {
  const [updated] = await db
    .update(kpiEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(kpiEntries.id, entryId))
    .returning();
  return updated;
}

// --- KPI Trend ---

export async function getKpiTrend(kpiId: number, limit: number = 12) {
  return db
    .select()
    .from(kpiEntries)
    .where(eq(kpiEntries.kpiId, kpiId))
    .orderBy(kpiEntries.period)
    .limit(limit);
}

// --- Action Plans ---

export async function getActionPlans(kpiId?: number) {
  if (kpiId) {
    return db.query.kpiActionPlans.findMany({
      where: eq(kpiActionPlans.kpiId, kpiId),
      orderBy: [desc(kpiActionPlans.createdAt)],
    });
  }
  return db.query.kpiActionPlans.findMany({
    orderBy: [desc(kpiActionPlans.createdAt)],
  });
}

export async function getPendingActionPlans(areaId?: number) {
  if (areaId) {
    // Get KPI IDs that belong to this area, then filter action plans
    const areaKpis = await db
      .select({ id: kpis.id })
      .from(kpis)
      .where(eq(kpis.areaId, areaId));
    const kpiIds = areaKpis.map((k) => k.id);

    if (kpiIds.length === 0) return [];

    return db
      .select()
      .from(kpiActionPlans)
      .where(
        and(
          sql`${kpiActionPlans.status} in ('pendiente', 'en_proceso')`,
          inArray(kpiActionPlans.kpiId, kpiIds)
        )
      )
      .orderBy(kpiActionPlans.dueDate);
  }

  return db
    .select()
    .from(kpiActionPlans)
    .where(
      sql`${kpiActionPlans.status} in ('pendiente', 'en_proceso')`
    )
    .orderBy(kpiActionPlans.dueDate);
}

export async function createActionPlan(
  data: Record<string, any>,
  createdById: number
) {
  const values: Record<string, any> = { ...data, createdById };
  if (data.dueDate) {
    values.dueDate = new Date(data.dueDate);
  }

  const [plan] = await db
    .insert(kpiActionPlans)
    .values(values as any)
    .returning();
  return plan;
}

export async function updateActionPlan(id: number, data: Record<string, any>) {
  const values: Record<string, any> = { ...data, updatedAt: new Date() };

  if (data.status === "completado") {
    values.completedDate = new Date();
  }
  if (data.dueDate) {
    values.dueDate = new Date(data.dueDate);
  }

  const [updated] = await db
    .update(kpiActionPlans)
    .set(values)
    .where(eq(kpiActionPlans.id, id))
    .returning();
  return updated;
}

// --- Area by Module Slug ---

export async function getAreaByModuleSlug(slug: string) {
  const area = await db.query.areas.findFirst({
    where: eq(areas.moduleSlug, slug),
  });
  if (!area) return null;
  return { areaId: area.id, areaName: area.name };
}

// --- Seed KPI Categories ---

let categoriesSeeded = false;

export async function seedKpiCategories() {
  if (categoriesSeeded) return;
  categoriesSeeded = true;

  const systemCategories = [
    { name: "financiero", displayName: "Financiero", icon: "DollarSign", color: "#22c55e" },
    { name: "operativo", displayName: "Operativo", icon: "Settings", color: "#3b82f6" },
    { name: "ambiental", displayName: "Ambiental", icon: "Leaf", color: "#10b981" },
    { name: "comercial", displayName: "Comercial", icon: "TrendingUp", color: "#f59e0b" },
    { name: "rrhh", displayName: "RRHH", icon: "Users", color: "#8b5cf6" },
    { name: "satisfaccion", displayName: "Satisfaccion", icon: "Heart", color: "#ef4444" },
  ];

  for (const cat of systemCategories) {
    const existing = await db.query.kpiCategories.findFirst({
      where: eq(kpiCategories.name, cat.name),
    });
    if (!existing) {
      await db.insert(kpiCategories).values({ ...cat, isSystem: true });
    }
  }

  categoriesSeeded = true;
}

import { Router } from "express";
import {
  insertActionPlanSchema,
  insertKpiCategorySchema,
  insertKpiEntrySchema,
  insertKpiSchema,
  updateActionPlanSchema,
  updateKpiEntrySchema,
  updateKpiSchema,
} from "../../../shared/schema/kpis";
import { requireAuth } from "../../middleware/auth";
import { isErrorWithMessage } from "../../utils/errors";
import {
  archiveKpi,
  createActionPlan,
  createKpi,
  createKpiCategory,
  createKpiEntry,
  getActionPlans,
  getAreaByModuleSlug,
  getKpiById,
  getKpiCategories,
  getKpiEntries,
  getKpiSummary,
  getKpis,
  getKpiTrend,
  getPendingActionPlans,
  seedKpiCategories,
  updateActionPlan,
  updateKpi,
  updateKpiEntry,
} from "./storage";

export const router = Router();

router.use(requireAuth);

// Seed categories on first request
let seeded = false;
router.use(async (_req, _res, next) => {
  if (!seeded) {
    try {
      await seedKpiCategories();
      seeded = true;
    } catch (error) {
      console.error("[kpis] Seed error:", error);
    }
  }
  next();
});

// ========================
// Summary (static route first)
// ========================

router.get("/summary", async (req, res) => {
  try {
    const { areaId } = req.query;
    const summary = await getKpiSummary(areaId ? Number(areaId) : undefined);
    res.json(summary);
  } catch (error) {
    console.error("[kpis] Get summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// Categories (static route before /:id)
// ========================

router.get("/categories", async (_req, res) => {
  try {
    const categories = await getKpiCategories();
    res.json(categories);
  } catch (error) {
    console.error("[kpis] Get categories error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const parsed = insertKpiCategorySchema.parse(req.body);
    const category = await createKpiCategory(parsed);
    res.status(201).json(category);
  } catch (error) {
    console.error("[kpis] Create category error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Action Plans - pending (static route before /:id)
// ========================

router.get("/action-plans/pending", async (req, res) => {
  try {
    const { areaId } = req.query;
    const plans = await getPendingActionPlans(areaId ? Number(areaId) : undefined);
    res.json(plans);
  } catch (error) {
    console.error("[kpis] Get pending action plans error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// KPIs CRUD
// ========================

router.get("/", async (req, res) => {
  try {
    const { categoryId, status, frequency, ownerId, areaId } = req.query;
    const kpis = await getKpis({
      categoryId: categoryId ? Number(categoryId) : undefined,
      status: status as string,
      frequency: frequency as string,
      ownerId: ownerId ? Number(ownerId) : undefined,
      areaId: areaId ? Number(areaId) : undefined,
    });
    res.json(kpis);
  } catch (error) {
    console.error("[kpis] Get kpis error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = insertKpiSchema.parse(req.body);
    const currentUser = req.user!;
    const kpi = await createKpi(parsed, currentUser.id);
    res.status(201).json(kpi);
  } catch (error) {
    console.error("[kpis] Create kpi error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Entries routes (static before param)
// ========================

router.patch("/entries/:entryId", async (req, res) => {
  try {
    const parsed = updateKpiEntrySchema.parse(req.body);
    const updated = await updateKpiEntry(Number(req.params.entryId), parsed);
    if (!updated) return res.status(404).json({ message: "Entrada no encontrada" });
    res.json(updated);
  } catch (error) {
    console.error("[kpis] Update entry error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Action Plans CRUD (static before param)
// ========================

router.post("/action-plans", async (req, res) => {
  try {
    const parsed = insertActionPlanSchema.parse(req.body);
    const currentUser = req.user!;
    const plan = await createActionPlan(parsed, currentUser.id);
    res.status(201).json(plan);
  } catch (error) {
    console.error("[kpis] Create action plan error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/action-plans/:id", async (req, res) => {
  try {
    const parsed = updateActionPlanSchema.parse(req.body);
    const updated = await updateActionPlan(Number(req.params.id), parsed);
    if (!updated) return res.status(404).json({ message: "Plan no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[kpis] Update action plan error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Area by module slug
// ========================

router.get("/area-by-module/:slug", async (req, res) => {
  try {
    const result = await getAreaByModuleSlug(req.params.slug);
    if (!result) return res.status(404).json({ message: "Area no encontrada para este modulo" });
    res.json(result);
  } catch (error) {
    console.error("[kpis] Get area by module slug error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// KPI by ID (parameterized routes last)
// ========================

router.get("/:id", async (req, res) => {
  try {
    const kpi = await getKpiById(Number(req.params.id));
    if (!kpi) return res.status(404).json({ message: "KPI no encontrado" });
    res.json(kpi);
  } catch (error) {
    console.error("[kpis] Get kpi error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const parsed = updateKpiSchema.parse(req.body);
    const updated = await updateKpi(Number(req.params.id), parsed);
    if (!updated) return res.status(404).json({ message: "KPI no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[kpis] Update kpi error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const archived = await archiveKpi(Number(req.params.id));
    if (!archived) return res.status(404).json({ message: "KPI no encontrado" });
    res.json(archived);
  } catch (error) {
    console.error("[kpis] Archive kpi error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// KPI Entries (nested under /:id)
// ========================

router.get("/:id/entries", async (req, res) => {
  try {
    const period = req.query.period as string | undefined;
    const entries = await getKpiEntries(Number(req.params.id), period);
    res.json(entries);
  } catch (error) {
    console.error("[kpis] Get entries error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:id/entries", async (req, res) => {
  try {
    const parsed = insertKpiEntrySchema.parse({
      ...req.body,
      kpiId: Number(req.params.id),
    });
    const currentUser = req.user!;
    const entry = await createKpiEntry({
      ...parsed,
      recordedById: currentUser.id,
    });
    res.status(201).json(entry);
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "KPI_NOT_FOUND")) {
      return res.status(404).json({ message: "KPI no encontrado" });
    }
    console.error("[kpis] Create entry error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// KPI Trend
// ========================

router.get("/:id/trend", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 12;
    const trend = await getKpiTrend(Number(req.params.id), limit);
    res.json(trend);
  } catch (error) {
    console.error("[kpis] Get trend error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// KPI Action Plans (nested under /:id)
// ========================

router.get("/:id/action-plans", async (req, res) => {
  try {
    const plans = await getActionPlans(Number(req.params.id));
    res.json(plans);
  } catch (error) {
    console.error("[kpis] Get kpi action plans error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

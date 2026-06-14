import { Router } from "express";
import { z } from "zod";
import { PERMISSIONS } from "../../../shared/auth/permissions";
import {
  insertClientReportSchema,
  insertEconomicModelSchema,
  insertServiceClientSchema,
  insertTraceabilitySchema,
  reportStatusEnum,
} from "../../../shared/schema/subproductos";
import { requireAuth, requirePermission } from "../../middleware/auth";
import { getErrorMessage } from "../../utils/errors";
import {
  createClientReport,
  createConciliation,
  createEconomicModel,
  createServiceClient,
  createTraceabilityRecord,
  getClientReports,
  getConciliations,
  getCotizacionById,
  getCotizaciones,
  getCotizacionKpis,
  getEconomicModelById,
  getEconomicModels,
  getPendingReports,
  getServiceClientById,
  getServiceClients,
  getSubproductosSummary,
  getTraceabilityByClient,
  getTraceabilityByPeriod,
  getTraceabilitySummary,
  resolveCotizacionVobo,
  submitCotizacionToVobo,
  takeCotizacion,
  updateCotizacion,
  updateEconomicModel,
  updateReportStatus,
  updateServiceClient,
} from "./storage";

// Inline schemas for simple routes
const reportStatusChangeSchema = z.object({
  status: z.enum(reportStatusEnum.enumValues, {
    required_error: "Status requerido",
    invalid_type_error: "Status inválido",
  }),
});

const insertConciliationSchema = z.object({
  clientId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Formato de periodo inválido (YYYY-MM)"),
  rmeManaged: z.union([z.string(), z.number()]).optional(),
  valorizationAchieved: z.union([z.string(), z.number()]).optional(),
  monthlyRevenue: z.union([z.string(), z.number()]).optional(),
  servicesDelivered: z.any().optional(),
  discrepancies: z.string().max(2000).optional(),
  isReconciled: z.boolean().optional(),
});

const cotizacionUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  monthlyVolume: z.string().max(200).optional(),
  proposedPrice: z.union([z.string(), z.number()]).optional(),
  estimatedCost: z.union([z.string(), z.number()]).optional(),
  estimatedMargin: z.union([z.string(), z.number()]).optional(),
  servicesIncluded: z.any().optional(),
  wasteComposition: z.any().optional(),
  notes: z.string().max(2000).optional(),
});

const voboDecisionSchema = z.object({
  decision: z.enum(["aprobar", "rechazar"]),
  rejectionReason: z.string().max(2000).optional(),
});

export const router = Router();

router.use(requireAuth);

// --- Summary ---

router.get("/summary", async (_req, res) => {
  try {
    const summary = await getSubproductosSummary();
    res.json(summary);
  } catch (error) {
    console.error("[subproductos] Summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Service Clients ---

router.get("/clients", async (_req, res) => {
  try {
    const clients = await getServiceClients();
    res.json(clients);
  } catch (error) {
    console.error("[subproductos] Get clients error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
    const client = await getServiceClientById(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Cliente no encontrado" });
    res.json(client);
  } catch (error) {
    console.error("[subproductos] Get client error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/clients", async (req, res) => {
  try {
    const parsed = insertServiceClientSchema.parse(req.body);
    const client = await createServiceClient(parsed);
    res.status(201).json(client);
  } catch (error) {
    console.error("[subproductos] Create client error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/clients/:id", async (req, res) => {
  try {
    const parsed = insertServiceClientSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateServiceClient(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Cliente no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[subproductos] Update client error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Traceability ---

router.get("/traceability/client/:clientId", async (req, res) => {
  try {
    const records = await getTraceabilityByClient(Number(req.params.clientId));
    res.json(records);
  } catch (error) {
    console.error("[subproductos] Get traceability error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/traceability/client/:clientId/summary", async (req, res) => {
  try {
    const summary = await getTraceabilitySummary(Number(req.params.clientId));
    res.json(summary);
  } catch (error) {
    console.error("[subproductos] Get traceability summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/traceability/period/:period", async (req, res) => {
  try {
    const records = await getTraceabilityByPeriod(req.params.period);
    res.json(records);
  } catch (error) {
    console.error("[subproductos] Get traceability by period error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/traceability", async (req, res) => {
  try {
    const parsed = insertTraceabilitySchema.parse(req.body);
    const record = await createTraceabilityRecord(parsed);
    res.status(201).json(record);
  } catch (error) {
    console.error("[subproductos] Create traceability error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// --- Reports ---

router.get("/reports", async (req, res) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const reports = await getClientReports(clientId);
    res.json(reports);
  } catch (error) {
    console.error("[subproductos] Get reports error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/reports/pending", async (_req, res) => {
  try {
    const reports = await getPendingReports();
    res.json(reports);
  } catch (error) {
    console.error("[subproductos] Get pending reports error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/reports", async (req, res) => {
  try {
    const parsed = insertClientReportSchema.parse(req.body);
    const report = await createClientReport(parsed);
    res.status(201).json(report);
  } catch (error) {
    console.error("[subproductos] Create report error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/reports/:id/status", async (req, res) => {
  try {
    const parsed = reportStatusChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const updated = await updateReportStatus(Number(req.params.id), parsed.data.status);
    if (!updated) return res.status(404).json({ message: "Reporte no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[subproductos] Update report status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Economic Models ---

router.get("/economic-models", async (req, res) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const models = await getEconomicModels(clientId);
    res.json(models);
  } catch (error) {
    console.error("[subproductos] Get economic models error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/economic-models/:id", async (req, res) => {
  try {
    const model = await getEconomicModelById(Number(req.params.id));
    if (!model) return res.status(404).json({ message: "Modelo no encontrado" });
    res.json(model);
  } catch (error) {
    console.error("[subproductos] Get economic model error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/economic-models", async (req, res) => {
  try {
    const parsed = insertEconomicModelSchema.parse(req.body);
    const model = await createEconomicModel(parsed);
    res.status(201).json(model);
  } catch (error) {
    console.error("[subproductos] Create economic model error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/economic-models/:id", async (req, res) => {
  try {
    const parsed = insertEconomicModelSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateEconomicModel(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Modelo no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[subproductos] Update economic model error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Conciliation ---

router.get("/conciliations", async (req, res) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const records = await getConciliations(clientId);
    res.json(records);
  } catch (error) {
    console.error("[subproductos] Get conciliations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/conciliations", async (req, res) => {
  try {
    const parsed = insertConciliationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const record = await createConciliation(parsed.data);
    res.status(201).json(record);
  } catch (error) {
    console.error("[subproductos] Create conciliation error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// --- Cotizaciones (bandeja) ---

router.get("/cotizaciones", requirePermission(PERMISSIONS.COTIZACIONES_VIEW), async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(await getCotizaciones(status));
  } catch (error: unknown) {
    console.error("[subproductos] Get cotizaciones error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/cotizaciones/kpis", requirePermission(PERMISSIONS.COTIZACIONES_VIEW), async (_req, res) => {
  try {
    res.json(await getCotizacionKpis());
  } catch (error: unknown) {
    console.error("[subproductos] Cotización KPIs error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/cotizaciones/:id", requirePermission(PERMISSIONS.COTIZACIONES_VIEW), async (req, res) => {
  try {
    const cot = await getCotizacionById(Number(req.params.id));
    if (!cot) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(cot);
  } catch (error: unknown) {
    console.error("[subproductos] Get cotización error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cotizaciones/:id/take", requirePermission(PERMISSIONS.COTIZACIONES_EDIT), async (req, res) => {
  try {
    const updated = await takeCotizacion(Number(req.params.id), req.user!.id);
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] Take cotización error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/cotizaciones/:id", requirePermission(PERMISSIONS.COTIZACIONES_EDIT), async (req, res) => {
  try {
    const parsed = cotizacionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    const updated = await updateCotizacion(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] Update cotización error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cotizaciones/:id/submit-vobo", requirePermission(PERMISSIONS.COTIZACIONES_EDIT), async (req, res) => {
  try {
    const updated = await submitCotizacionToVobo(Number(req.params.id));
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] Submit VoBo error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cotizaciones/:id/vobo", requirePermission(PERMISSIONS.COTIZACIONES_VOBO), async (req, res) => {
  try {
    const parsed = voboDecisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    const updated = await resolveCotizacionVobo(
      Number(req.params.id),
      req.user!.id,
      parsed.data.decision,
      parsed.data.rejectionReason,
    );
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] VoBo decision error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

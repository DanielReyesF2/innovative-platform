import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  getProspects,
  getProspectById,
  getProspectsByStage,
  createProspect,
  updateProspect,
  rejectProspect,
  getLeads,
  createLead,
  assignLead,
  convertLeadToProspect,
  getRejectionReasons,
  getPipelineSummary,
  getSalesMetrics,
  getSalesMetricsByUser,
} from "./storage";
import { insertProspectSchema, insertLeadSchema } from "../../../shared/schema/comercial";

export const router = Router();

router.use(requireAuth);

// --- Prospects ---

router.get("/prospects", async (_req, res) => {
  try {
    const prospects = await getProspects();
    res.json(prospects);
  } catch (error) {
    console.error("[comercial] Get prospects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/prospects/:id", async (req, res) => {
  try {
    const prospect = await getProspectById(Number(req.params.id));
    if (!prospect) return res.status(404).json({ message: "Prospecto no encontrado" });
    res.json(prospect);
  } catch (error) {
    console.error("[comercial] Get prospect error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/prospects/stage/:stage", async (req, res) => {
  try {
    const prospects = await getProspectsByStage(req.params.stage);
    res.json(prospects);
  } catch (error) {
    console.error("[comercial] Get prospects by stage error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects", async (req, res) => {
  try {
    const parsed = insertProspectSchema.parse(req.body);
    const prospect = await createProspect(parsed);
    res.status(201).json(prospect);
  } catch (error) {
    console.error("[comercial] Create prospect error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/prospects/:id", async (req, res) => {
  try {
    const updated = await updateProspect(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Prospecto no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update prospect error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:id/reject", async (req, res) => {
  try {
    const { rejectionReasonId, rejectionDetail } = req.body;
    if (!rejectionReasonId) {
      return res.status(400).json({ message: "Motivo de rechazo requerido" });
    }
    const updated = await rejectProspect(
      Number(req.params.id),
      rejectionReasonId,
      rejectionDetail || ""
    );
    if (!updated) return res.status(404).json({ message: "Prospecto no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Reject prospect error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Leads ---

router.get("/leads", async (_req, res) => {
  try {
    const leads = await getLeads();
    res.json(leads);
  } catch (error) {
    console.error("[comercial] Get leads error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const parsed = insertLeadSchema.parse(req.body);
    const lead = await createLead(parsed);
    res.status(201).json(lead);
  } catch (error) {
    console.error("[comercial] Create lead error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/leads/:id/assign", async (req, res) => {
  try {
    const { assignedToId } = req.body;
    if (!assignedToId) return res.status(400).json({ message: "assignedToId requerido" });
    const updated = await assignLead(Number(req.params.id), assignedToId);
    if (!updated) return res.status(404).json({ message: "Lead no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Assign lead error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/leads/:id/convert", async (req, res) => {
  try {
    const { prospectId } = req.body;
    if (!prospectId) return res.status(400).json({ message: "prospectId requerido" });
    const updated = await convertLeadToProspect(Number(req.params.id), prospectId);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Convert lead error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Rejection Reasons ---

router.get("/rejection-reasons", async (_req, res) => {
  try {
    const reasons = await getRejectionReasons();
    res.json(reasons);
  } catch (error) {
    console.error("[comercial] Get rejection reasons error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Pipeline ---

router.get("/pipeline", async (_req, res) => {
  try {
    const summary = await getPipelineSummary();
    res.json(summary);
  } catch (error) {
    console.error("[comercial] Get pipeline error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Sales Metrics ---

router.get("/sales-metrics", async (req, res) => {
  try {
    const period = req.query.period as string | undefined;
    const metrics = await getSalesMetrics(period);
    res.json(metrics);
  } catch (error) {
    console.error("[comercial] Get sales metrics error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/sales-metrics/user/:userId", async (req, res) => {
  try {
    const metrics = await getSalesMetricsByUser(Number(req.params.userId));
    res.json(metrics);
  } catch (error) {
    console.error("[comercial] Get user sales metrics error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

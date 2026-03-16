import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  getProspects,
  getProspectById,
  getProspectsByStage,
  createProspect,
  updateProspect,
  deleteProspect,
  rejectProspect,
  qualifyProspect,
  getLeads,
  createLead,
  assignLead,
  convertLeadToProspect,
  getRejectionReasons,
  getPipelineSummary,
  getSalesMetrics,
  getSalesMetricsByUser,
  sendProspectToOperaciones,
  // CRM enhancements
  getProspectActivities,
  createActivity,
  getProspectNotes,
  createNote,
  updateNote,
  deleteNote,
  toggleNotePin,
  getProspectMeetings,
  createMeeting,
  completeMeeting,
  cancelMeeting,
  getProspectDocuments,
  createDocument,
  deleteDocument,
  getProposalVersions,
  createProposal,
  sendProposal,
  changeProposalStatus,
  getAlerts,
  getPendingAlertsCount,
  acknowledgeAlert,
  dismissAlert,
  generateAlerts,
  getLeadSourcesReport,
  getSalesForecast,
  getWinLossAnalysis,
  getCompetitorAnalysis,
  getComercialTeam,
  // Post-reunion Vero
  getVentasReales,
  getVentasRealesByUser,
  createOrUpdateVentaReal,
  getKpisMensuales,
  getKpisMensualesByUser,
  createOrUpdateKpiMensual,
  getRechazadasConVencimiento,
  getRechazadasProximasAVencer,
  getWeeklyReport,
  upsertWeeklyReport,
  markWeeklyReportAsSent,
} from "./storage";
import { insertProspectSchema, insertLeadSchema, insertVentaRealSchema, insertKpiMensualSchema, qualifyProspectSchema } from "../../../shared/schema/comercial";
import { triggerWebhook } from "../../lib/webhook";

export const router = Router();

// Configure multer for document uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../../dist/uploads/comercial");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const prospectId = req.params.id;
    const prospectDir = path.join(uploadsDir, prospectId);
    if (!fs.existsSync(prospectDir)) {
      fs.mkdirSync(prospectDir, { recursive: true });
    }
    cb(null, prospectDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  },
});

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
    // Validate: only allow known prospect fields
    const allowed = insertProspectSchema.partial().safeParse(req.body);
    if (!allowed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: allowed.error.errors });
    }
    const updated = await updateProspect(Number(req.params.id), allowed.data);
    if (!updated) return res.status(404).json({ message: "Prospecto no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update prospect error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/prospects/:id", requireRole("admin", "comercial", "director"), async (req, res) => {
  try {
    const deleted = await deleteProspect(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Prospecto no encontrado" });
    res.json({ success: true });
  } catch (error) {
    console.error("[comercial] Delete prospect error:", error);
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

// --- Qualify Lead → Prospecto ---

router.post("/prospects/:id/qualify", async (req, res) => {
  try {
    const parsed = qualifyProspectSchema.parse(req.body);
    const updated = await qualifyProspect(Number(req.params.id), parsed);
    res.json(updated);
  } catch (error: any) {
    console.error("[comercial] Qualify prospect error:", error);
    const msg = error.message || "Internal server error";
    if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Prospecto no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
    if (error.name === "ZodError") return res.status(400).json({ message: "Datos invalidos", errors: error.errors });
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Handoff to Operaciones ---

router.post(
  "/prospects/:id/send-to-operaciones",
  requireRole("admin", "comercial", "director"),
  async (req, res) => {
    try {
      const result = await sendProspectToOperaciones(
        Number(req.params.id),
        (req as any).user.id
      );
      res.json(result);
    } catch (error: any) {
      console.error("[comercial] Send to operaciones error:", error);
      const msg = error.message || "Internal server error";
      if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Prospecto no encontrado" });
      if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
      if (msg.startsWith("VALIDATION:")) return res.status(400).json({ message: msg.slice(11) });
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

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
    const { industry, location, potential, estimatedValue, estimatedVolume, wasteInfo } = req.body;
    const result = await convertLeadToProspect(Number(req.params.id), {
      industry,
      location,
      potential,
      estimatedValue,
      estimatedVolume,
      wasteInfo,
    });
    res.status(201).json(result);
  } catch (error: any) {
    console.error("[comercial] Convert lead error:", error);
    const msg = error.message || "Internal server error";
    if (msg === "NOT_FOUND") return res.status(404).json({ message: "Lead no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
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

// === CRM ENHANCEMENT ROUTES ===

// --- Activities ---

router.get("/prospects/:id/activities", async (req, res) => {
  try {
    const activities = await getProspectActivities(Number(req.params.id));
    res.json(activities);
  } catch (error) {
    console.error("[comercial] Get activities error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:id/activities", async (req, res) => {
  try {
    const activity = await createActivity({
      ...req.body,
      prospectId: Number(req.params.id),
      createdById: (req as any).user.id,
    });
    res.status(201).json(activity);
  } catch (error) {
    console.error("[comercial] Create activity error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// --- Notes ---

router.get("/prospects/:id/notes", async (req, res) => {
  try {
    const notes = await getProspectNotes(Number(req.params.id));
    res.json(notes);
  } catch (error) {
    console.error("[comercial] Get notes error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:id/notes", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Contenido requerido" });
    const note = await createNote(Number(req.params.id), content, (req as any).user.id);
    res.status(201).json(note);
  } catch (error) {
    console.error("[comercial] Create note error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/prospects/:prospectId/notes/:noteId", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Contenido requerido" });
    const updated = await updateNote(Number(req.params.noteId), content);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update note error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/prospects/:prospectId/notes/:noteId", async (req, res) => {
  try {
    await deleteNote(Number(req.params.noteId));
    res.json({ success: true });
  } catch (error) {
    console.error("[comercial] Delete note error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:prospectId/notes/:noteId/toggle-pin", async (req, res) => {
  try {
    const updated = await toggleNotePin(Number(req.params.noteId));
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Toggle pin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Meetings ---

router.get("/prospects/:id/meetings", async (req, res) => {
  try {
    const meetings = await getProspectMeetings(Number(req.params.id));
    res.json(meetings);
  } catch (error) {
    console.error("[comercial] Get meetings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:id/meetings", async (req, res) => {
  try {
    const meeting = await createMeeting({
      ...req.body,
      prospectId: Number(req.params.id),
      createdById: (req as any).user.id,
    });
    res.status(201).json(meeting);
  } catch (error) {
    console.error("[comercial] Create meeting error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.post("/prospects/:prospectId/meetings/:meetingId/complete", async (req, res) => {
  try {
    const { outcome } = req.body;
    if (!outcome) return res.status(400).json({ message: "Resultado requerido" });
    const updated = await completeMeeting(Number(req.params.meetingId), outcome);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Complete meeting error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:prospectId/meetings/:meetingId/cancel", async (req, res) => {
  try {
    const updated = await cancelMeeting(Number(req.params.meetingId));
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Cancel meeting error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Documents ---

router.get("/prospects/:id/documents", async (req, res) => {
  try {
    const documents = await getProspectDocuments(Number(req.params.id));
    res.json(documents);
  } catch (error) {
    console.error("[comercial] Get documents error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:id/documents", async (req, res) => {
  try {
    const document = await createDocument({
      ...req.body,
      prospectId: Number(req.params.id),
      uploadedById: (req as any).user.id,
    });
    res.status(201).json(document);
  } catch (error) {
    console.error("[comercial] Create document error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.delete("/prospects/:prospectId/documents/:docId", async (req, res) => {
  try {
    await deleteDocument(Number(req.params.docId));
    res.json({ success: true });
  } catch (error) {
    console.error("[comercial] Delete document error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Proposals ---

router.get("/prospects/:id/proposals", async (req, res) => {
  try {
    const proposals = await getProposalVersions(Number(req.params.id));
    res.json(proposals);
  } catch (error) {
    console.error("[comercial] Get proposals error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:id/proposals", async (req, res) => {
  try {
    const proposal = await createProposal({
      ...req.body,
      prospectId: Number(req.params.id),
      createdById: (req as any).user.id,
    });
    res.status(201).json(proposal);
  } catch (error) {
    console.error("[comercial] Create proposal error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.post("/prospects/:prospectId/proposals/:proposalId/send", async (req, res) => {
  try {
    const updated = await sendProposal(Number(req.params.proposalId), (req as any).user.id);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Send proposal error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:prospectId/proposals/:proposalId/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status requerido" });
    const updated = await changeProposalStatus(Number(req.params.proposalId), status);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Change proposal status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Alerts ---

router.get("/alerts", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const alerts = await getAlerts(status, (req as any).user.id);
    res.json(alerts);
  } catch (error) {
    console.error("[comercial] Get alerts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/alerts/count", async (req, res) => {
  try {
    const count = await getPendingAlertsCount((req as any).user.id);
    res.json({ count });
  } catch (error) {
    console.error("[comercial] Get alerts count error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/alerts/:id/acknowledge", async (req, res) => {
  try {
    const updated = await acknowledgeAlert(Number(req.params.id), (req as any).user.id);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Acknowledge alert error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/alerts/:id/dismiss", async (req, res) => {
  try {
    const updated = await dismissAlert(Number(req.params.id));
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Dismiss alert error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/alerts/generate", requireRole("admin"), async (_req, res) => {
  try {
    const result = await generateAlerts();
    res.json(result);
  } catch (error) {
    console.error("[comercial] Generate alerts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Reports ---

router.get("/reports/lead-sources", async (_req, res) => {
  try {
    const report = await getLeadSourcesReport();
    res.json(report);
  } catch (error) {
    console.error("[comercial] Lead sources report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/reports/forecast", async (_req, res) => {
  try {
    const forecast = await getSalesForecast();
    res.json(forecast);
  } catch (error) {
    console.error("[comercial] Sales forecast error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/reports/win-loss", async (_req, res) => {
  try {
    const analysis = await getWinLossAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error("[comercial] Win/loss analysis error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/reports/competitors", async (_req, res) => {
  try {
    const analysis = await getCompetitorAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error("[comercial] Competitor analysis error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Comercial Team ---

router.get("/team", async (_req, res) => {
  try {
    const team = await getComercialTeam();
    res.json(team);
  } catch (error) {
    console.error("[comercial] Get team error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// === POST-REUNION VERO ROUTES (Feb 2026) ===

// --- Ventas Reales ---

router.get("/ventas-reales", async (req, res) => {
  try {
    const año = req.query.año ? Number(req.query.año) : undefined;
    const ventas = await getVentasReales(año);
    res.json(ventas);
  } catch (error) {
    console.error("[comercial] Get ventas reales error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/ventas-reales/user/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const año = req.query.año ? Number(req.query.año) : undefined;
    const ventas = await getVentasRealesByUser(userId, año);
    res.json(ventas);
  } catch (error) {
    console.error("[comercial] Get user ventas reales error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/ventas-reales", async (req, res) => {
  try {
    const parsed = insertVentaRealSchema.parse(req.body);
    const venta = await createOrUpdateVentaReal(parsed);
    res.status(201).json(venta);
  } catch (error) {
    console.error("[comercial] Create venta real error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// --- KPIs Mensuales ---

router.get("/kpis-mensuales", async (req, res) => {
  try {
    const año = req.query.año ? Number(req.query.año) : undefined;
    const kpis = await getKpisMensuales(año);
    res.json(kpis);
  } catch (error) {
    console.error("[comercial] Get kpis mensuales error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/kpis-mensuales/user/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const año = req.query.año ? Number(req.query.año) : undefined;
    const kpis = await getKpisMensualesByUser(userId, año);
    res.json(kpis);
  } catch (error) {
    console.error("[comercial] Get user kpis mensuales error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/kpis-mensuales", requireRole("admin"), async (req, res) => {
  try {
    const parsed = insertKpiMensualSchema.parse(req.body);
    const kpi = await createOrUpdateKpiMensual(parsed);
    res.status(201).json(kpi);
  } catch (error) {
    console.error("[comercial] Create kpi mensual error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// --- Rechazadas con Vencimiento de Contrato ---

router.get("/rechazadas/con-vencimiento", async (_req, res) => {
  try {
    const rechazadas = await getRechazadasConVencimiento();
    res.json(rechazadas);
  } catch (error) {
    console.error("[comercial] Get rechazadas con vencimiento error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/rechazadas/proximas-a-vencer", async (req, res) => {
  try {
    const dias = req.query.dias ? Number(req.query.dias) : 30;
    const rechazadas = await getRechazadasProximasAVencer(dias);
    res.json(rechazadas);
  } catch (error) {
    console.error("[comercial] Get rechazadas proximas a vencer error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Document Upload ---

router.post("/prospects/:id/documents/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Archivo requerido" });
    }

    const prospectId = Number(req.params.id);
    const tipo = (req.body.tipo as string) || "otro";
    const markAsClosed = req.body.markAsClosed === "true";

    // Create document record
    const relativePath = `/uploads/comercial/${prospectId}/${file.filename}`;
    const document = await createDocument({
      prospectId,
      name: file.originalname,
      type: tipo,
      url: relativePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedById: (req as any).user.id,
    });

    // If it's an OC and user wants to mark as closed
    if (tipo === "orden_compra" && markAsClosed) {
      await updateProspect(prospectId, { stage: "cierre_ganado" });
    }

    res.status(201).json(document);
  } catch (error) {
    console.error("[comercial] Upload document error:", error);
    res.status(500).json({ message: "Error al subir archivo" });
  }
});

// Serve uploaded files
router.get("/uploads/:prospectId/:filename", async (req, res) => {
  try {
    const { prospectId, filename } = req.params;
    const filePath = path.join(uploadsDir, prospectId, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error("[comercial] Serve file error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// === RESUMEN SEMANAL (Weekly Management Report) ===

router.get("/weekly-report", async (req, res) => {
  try {
    const week = req.query.week as string;
    if (!week) return res.status(400).json({ message: "Parámetro 'week' requerido" });
    const report = await getWeeklyReport((req as any).user.id, week);
    res.json(report || null);
  } catch (error) {
    console.error("[comercial] Get weekly report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/weekly-report", async (req, res) => {
  try {
    const { weekStart, content } = req.body;
    if (!weekStart) return res.status(400).json({ message: "weekStart requerido" });
    const report = await upsertWeeklyReport(
      (req as any).user.id,
      weekStart,
      content || "",
    );
    res.json(report);
  } catch (error) {
    console.error("[comercial] Save weekly report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/weekly-report/send", async (req, res) => {
  try {
    const { weekStart, recipients } = req.body;
    if (!weekStart || !recipients?.length) {
      return res.status(400).json({ message: "weekStart y recipients requeridos" });
    }

    const recipientStr = recipients.join(",");

    // Ensure report exists (save content first if provided)
    let report = await getWeeklyReport((req as any).user.id, weekStart);
    if (!report) {
      report = await upsertWeeklyReport(
        (req as any).user.id,
        weekStart,
        req.body.content || "",
      );
    } else if (req.body.content !== undefined) {
      report = await upsertWeeklyReport(
        (req as any).user.id,
        weekStart,
        req.body.content,
      );
    }

    // Try to trigger n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_RESUMEN_URL;
    if (webhookUrl) {
      await triggerWebhook(webhookUrl, {
        content: report.content,
        recipients,
        subject: `Resumen Semanal — Semana del ${weekStart}`,
        senderName: (req as any).user.name || "Comercial",
        weekStart,
      });
    } else {
      console.warn("[comercial] N8N_WEBHOOK_RESUMEN_URL not configured — skipping webhook");
    }

    // Mark as sent regardless (graceful fallback)
    const updated = await markWeeklyReportAsSent(report.id, recipientStr);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Send weekly report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

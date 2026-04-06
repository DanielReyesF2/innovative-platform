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
  upsertSalesMetric,
  getRechazadasConVencimiento,
  getRechazadasProximasAVencer,
  getWeeklyReport,
  upsertWeeklyReport,
  markWeeklyReportAsSent,
  getWeeklyReportsInRange,
  getCommitmentsByWeek,
  getPendingCommitments,
  createCommitment,
  updateCommitmentStatus,
  deleteCommitment,
} from "./storage";
import { z } from "zod";
import { insertProspectSchema, insertLeadSchema, insertVentaRealSchema, insertKpiMensualSchema, qualifyProspectSchema, insertActivitySchema, insertNoteSchema, insertMeetingSchema, insertProspectDocumentSchema, insertProposalSchema, proposalStatusEnum, insertWeeklyReportSchema } from "../../../shared/schema/comercial";
import { triggerWebhook } from "../../lib/webhook";

/** Extract error message safely without `as any` */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Internal server error";
}

function isZodError(error: unknown): error is { name: "ZodError"; errors: unknown[] } {
  return error instanceof Error && error.name === "ZodError" && "errors" in error;
}

// Inline schemas for simple routes
const rejectProspectSchema = z.object({
  rejectionReasonId: z.number({ required_error: "Motivo de rechazo requerido" }).int().positive(),
  rejectionDetail: z.string().max(2000).optional().default(""),
});

const convertLeadSchema = z.object({
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  potential: z.string().max(20).optional(),
  estimatedValue: z.string().max(50).optional(),
  estimatedVolume: z.string().max(100).optional(),
  wasteInfo: z.object({
    wasteTypes: z.array(z.string()),
    estimatedVolume: z.string(),
    hasCurrentProvider: z.boolean(),
    currentProviderName: z.string().optional(),
    reasonForChange: z.string().optional(),
  }).optional(),
});

const assignLeadSchema = z.object({
  assignedToId: z.number({ required_error: "assignedToId requerido" }).int().positive(),
});

const meetingCompleteSchema = z.object({
  outcome: z.string().min(1, "Resultado requerido").max(2000),
});

const proposalStatusChangeSchema = z.object({
  status: z.enum(["borrador", "enviada", "revisada", "aceptada", "rechazada"], {
    required_error: "Status requerido",
    invalid_type_error: "Status inválido",
  }),
});

const weeklyReportSaveSchema = z.object({
  weekStart: z.string().min(1, "weekStart requerido"),
  content: z.string().max(50000).optional().default(""),
  meetingNotes: z.string().max(50000).optional(),
});

const weeklyReportSendSchema = z.object({
  weekStart: z.string().min(1, "weekStart requerido"),
  recipients: z.array(z.string().email()).min(1, "recipients requeridos"),
  content: z.string().max(50000).optional(),
});

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
    const parsed = insertProspectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const prospect = await createProspect(parsed.data);
    res.status(201).json(prospect);
  } catch (error) {
    console.error("[comercial] Create prospect error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/prospects/:id", async (req, res) => {
  try {
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
    const parsed = rejectProspectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    // Validate rejection reason exists in DB
    const reasons = await getRejectionReasons();
    const validReason = reasons.find(r => r.id === parsed.data.rejectionReasonId);
    if (!validReason) {
      return res.status(400).json({ message: "Motivo de rechazo inválido" });
    }
    const updated = await rejectProspect(
      Number(req.params.id),
      parsed.data.rejectionReasonId,
      parsed.data.rejectionDetail || ""
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
    const parsed = qualifyProspectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const updated = await qualifyProspect(Number(req.params.id), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Qualify prospect error:", error);
    const msg = getErrorMessage(error);
    if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Prospecto no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
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
        req.user!.id
      );
      res.json(result);
    } catch (error) {
      console.error("[comercial] Send to operaciones error:", error);
      const msg = getErrorMessage(error);
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
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const lead = await createLead(parsed.data);
    res.status(201).json(lead);
  } catch (error) {
    console.error("[comercial] Create lead error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/leads/:id/assign", async (req, res) => {
  try {
    const parsed = assignLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const updated = await assignLead(Number(req.params.id), parsed.data.assignedToId);
    if (!updated) return res.status(404).json({ message: "Lead no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Assign lead error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/leads/:id/convert", async (req, res) => {
  try {
    const parsed = convertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const result = await convertLeadToProspect(Number(req.params.id), parsed.data);
    res.status(201).json(result);
  } catch (error) {
    console.error("[comercial] Convert lead error:", error);
    const msg = getErrorMessage(error);
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

const upsertSalesMetricSchema = z.object({
  userId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Formato requerido: YYYY-MM"),
  monthlyBudget: z.number().min(0, "El presupuesto no puede ser negativo"),
});

router.patch("/sales-metrics", requireRole("admin", "director"), async (req, res) => {
  try {
    const parsed = upsertSalesMetricSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const { userId, period, monthlyBudget } = parsed.data;
    const result = await upsertSalesMetric(userId, period, monthlyBudget);
    res.json(result);
  } catch (error) {
    console.error("[comercial] Upsert sales metric error:", error);
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
    const { type, title, description, activityDate, metadata } = req.body;
    const parsed = insertActivitySchema.safeParse({
      type,
      title,
      description,
      metadata,
      prospectId: Number(req.params.id),
      createdById: req.user!.id,
      ...(activityDate && { activityDate: new Date(activityDate) }),
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const activity = await createActivity(parsed.data);
    res.status(201).json(activity);
  } catch (error) {
    console.error("[comercial] Create activity error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const parsed = z.object({ content: z.string().min(1, "Contenido requerido").max(5000) }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const note = await createNote(Number(req.params.id), parsed.data.content, req.user!.id);
    res.status(201).json(note);
  } catch (error) {
    console.error("[comercial] Create note error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/prospects/:prospectId/notes/:noteId", async (req, res) => {
  try {
    const parsed = z.object({ content: z.string().min(1, "Contenido requerido").max(5000) }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const updated = await updateNote(Number(req.params.noteId), parsed.data.content);
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
    const { title, description, scheduledAt: rawScheduledAt, duration, location, meetingUrl, attendees } = req.body;
    const scheduledAt = new Date(rawScheduledAt);
    if (isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ message: "Fecha de reunion invalida" });
    }
    const parsed = insertMeetingSchema.safeParse({
      title,
      description,
      duration,
      location,
      meetingUrl,
      attendees,
      prospectId: Number(req.params.id),
      createdById: req.user!.id,
      scheduledAt,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const meeting = await createMeeting(parsed.data);
    res.status(201).json(meeting);
  } catch (error) {
    console.error("[comercial] Create meeting error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:prospectId/meetings/:meetingId/complete", async (req, res) => {
  try {
    const parsed = meetingCompleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const updated = await completeMeeting(Number(req.params.meetingId), parsed.data.outcome);
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
    const { name, type, url, fileSize, mimeType, description } = req.body;
    const parsed = insertProspectDocumentSchema.safeParse({
      name,
      type,
      url,
      fileSize,
      mimeType,
      description,
      prospectId: Number(req.params.id),
      uploadedById: req.user!.id,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const document = await createDocument(parsed.data);
    res.status(201).json(document);
  } catch (error) {
    console.error("[comercial] Create document error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const { name, url, amount, validUntil, notes, version } = req.body;
    const parsed = insertProposalSchema.safeParse({
      name,
      url,
      amount,
      validUntil,
      notes,
      version,
      prospectId: Number(req.params.id),
      createdById: req.user!.id,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const proposal = await createProposal(parsed.data);
    res.status(201).json(proposal);
  } catch (error) {
    console.error("[comercial] Create proposal error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:prospectId/proposals/:proposalId/send", async (req, res) => {
  try {
    const updated = await sendProposal(Number(req.params.proposalId), req.user!.id);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Send proposal error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/prospects/:prospectId/proposals/:proposalId/status", async (req, res) => {
  try {
    const parsed = proposalStatusChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const updated = await changeProposalStatus(Number(req.params.proposalId), parsed.data.status);
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
    const alerts = await getAlerts(status, req.user!.id);
    res.json(alerts);
  } catch (error) {
    console.error("[comercial] Get alerts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/alerts/count", async (req, res) => {
  try {
    const count = await getPendingAlertsCount(req.user!.id);
    res.json({ count });
  } catch (error) {
    console.error("[comercial] Get alerts count error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/alerts/:id/acknowledge", async (req, res) => {
  try {
    const updated = await acknowledgeAlert(Number(req.params.id), req.user!.id);
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
    const parsed = insertVentaRealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const venta = await createOrUpdateVentaReal(parsed.data);
    res.status(201).json(venta);
  } catch (error) {
    console.error("[comercial] Create venta real error:", error);
    res.status(500).json({ message: "Internal server error" });
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
    const parsed = insertKpiMensualSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const kpi = await createOrUpdateKpiMensual(parsed.data);
    res.status(201).json(kpi);
  } catch (error) {
    console.error("[comercial] Create kpi mensual error:", error);
    res.status(500).json({ message: "Internal server error" });
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

const uploadBodySchema = z.object({
  tipo: z.string().max(50).default("otro"),
  markAsClosed: z.enum(["true", "false"]).default("false"),
});

router.post("/prospects/:id/documents/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Archivo requerido" });
    }

    const prospectId = Number(req.params.id);
    const bodyParsed = uploadBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: bodyParsed.error.errors });
    }
    const { tipo, markAsClosed: markAsClosedStr } = bodyParsed.data;
    const markAsClosed = markAsClosedStr === "true";

    // Create document record
    const relativePath = `/uploads/comercial/${prospectId}/${file.filename}`;
    const document = await createDocument({
      prospectId,
      name: file.originalname,
      type: tipo,
      url: relativePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedById: req.user!.id,
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
    const report = await getWeeklyReport(req.user!.id, week);
    res.json(report || null);
  } catch (error) {
    console.error("[comercial] Get weekly report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/weekly-report", async (req, res) => {
  try {
    const parsed = weeklyReportSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const report = await upsertWeeklyReport(
      req.user!.id,
      parsed.data.weekStart,
      parsed.data.content,
      "draft",
      parsed.data.meetingNotes,
    );
    res.json(report);
  } catch (error) {
    console.error("[comercial] Save weekly report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/weekly-report/send", async (req, res) => {
  try {
    const parsed = weeklyReportSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const { weekStart, recipients, content } = parsed.data;

    const recipientStr = recipients.join(",");

    // Ensure report exists (save content first if provided)
    let report = await getWeeklyReport(req.user!.id, weekStart);
    if (!report) {
      report = await upsertWeeklyReport(
        req.user!.id,
        weekStart,
        content || "",
      );
    } else if (content !== undefined) {
      report = await upsertWeeklyReport(
        req.user!.id,
        weekStart,
        content,
      );
    }

    // Try to trigger n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_RESUMEN_URL;
    if (webhookUrl) {
      await triggerWebhook(webhookUrl, {
        content: report.content,
        recipients,
        subject: `Resumen Semanal — Semana del ${weekStart}`,
        senderName: req.user!.name || "Comercial",
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

// --- Weekly Reports Range (calendar view) ---

router.get("/weekly-reports", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: "Parámetros 'from' y 'to' requeridos" });
    const reports = await getWeeklyReportsInRange(req.user!.id, from as string, to as string);
    res.json(reports);
  } catch (error) {
    console.error("[comercial] Get weekly reports range error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Weekly Commitments ---

const commitmentCreateSchema = z.object({
  weekStart: z.string().min(1),
  description: z.string().min(1).max(500),
  responsible: z.string().min(1).max(100),
  dueDate: z.string().nullable().optional(),
});

router.get("/commitments", async (req, res) => {
  try {
    const week = req.query.week as string;
    if (week) {
      const commitments = await getCommitmentsByWeek(req.user!.id, week);
      return res.json(commitments);
    }
    // No week param = get all pending
    const pending = await getPendingCommitments(req.user!.id);
    res.json(pending);
  } catch (error) {
    console.error("[comercial] Get commitments error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/commitments", async (req, res) => {
  try {
    const parsed = commitmentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const commitment = await createCommitment({
      ...parsed.data,
      dueDate: parsed.data.dueDate || undefined,
      createdById: req.user!.id,
    });
    res.status(201).json(commitment);
  } catch (error) {
    console.error("[comercial] Create commitment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/commitments/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = req.body.status;
    if (!["pendiente", "cumplido"].includes(status)) {
      return res.status(400).json({ message: "Status debe ser 'pendiente' o 'cumplido'" });
    }
    const updated = await updateCommitmentStatus(id, status);
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update commitment status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/commitments/:id", async (req, res) => {
  try {
    const deleted = await deleteCommitment(Number(req.params.id));
    res.json(deleted);
  } catch (error) {
    console.error("[comercial] Delete commitment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

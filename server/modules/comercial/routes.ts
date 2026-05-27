import { eq } from "drizzle-orm";
import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  insertActivitySchema,
  insertKpiMensualSchema,
  insertLeadSchema,
  insertMeetingSchema,
  insertNoteSchema,
  insertProposalSchema,
  insertProspectDocumentSchema,
  insertProspectSchema,
  insertVentaRealSchema,
  insertWeeklyReportSchema,
  proposalStatusEnum,
  qualifyProspectSchema,
} from "../../../shared/schema/comercial";
import { STAGE } from "../../../shared/schema/comercial-stages";
import { users } from "../../../shared/schema/common";
import { db } from "../../db";
import { triggerWebhook } from "../../lib/webhook";
import { gcsEnabled, getSignedReadUrl, uploadBuffer } from "../../lib/gcs";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  acknowledgeAlert,
  assignLead,
  cancelMeeting,
  changeProposalStatus,
  completeMeeting,
  convertLeadToProspect,
  createActivity,
  createCommitment,
  createDocument,
  createLead,
  createMeeting,
  createNote,
  createOrUpdateKpiMensual,
  createOrUpdateVentaReal,
  createProposal,
  createProspect,
  deleteCommitment,
  deleteDocument,
  deleteMeeting,
  deleteNote,
  deleteProspect,
  dismissAlert,
  generateAlerts,
  getAlerts,
  getAverageDurationByStage,
  getComercialTeam,
  getCommitmentsByWeek,
  getCommitmentsInRange,
  getCompetitorAnalysis,
  getKpisMensuales,
  getKpisMensualesByUser,
  getLeadSourcesReport,
  getLeads,
  getPendingAlertsCount,
  getPendingCommitments,
  getPipelineSummary,
  getProposalVersions,
  // CRM enhancements
  getProspectActivities,
  getProspectById,
  getProspectDocuments,
  getProspectMeetings,
  getProspectNotes,
  getProspects,
  getProspectsByStage,
  getRechazadasConVencimiento,
  getRechazadasProximasAVencer,
  getRejectionReasons,
  getSalesForecast,
  getSalesMetrics,
  getSalesMetricsByUser,
  getStageTransitions,
  // Post-reunion Vero
  getVentasReales,
  getVentasRealesByUser,
  getWeeklyReport,
  getWeeklyReportsInRange,
  getWinLossAnalysis,
  markWeeklyReportAsSent,
  qualifyProspect,
  rejectProspect,
  sendProposal,
  sendProspectToOperaciones,
  toggleNotePin,
  updateCommitment,
  updateCommitmentStatus,
  updateMeeting,
  updateNote,
  updateProposal,
  updateProposalAmount,
  updateProspect,
  upsertSalesMetric,
  upsertWeeklyReport,
} from "./storage";

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

// Per Vero's flow (Prospecto stage): solo pedimos datos de contacto que
// faltan del Lead + ubicación + frecuencia opcional. Potencial / cotización
// / residuos entran en etapas posteriores, NO aquí.
const convertLeadSchema = z.object({
  contactRole: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().max(200).optional(),
  location: z.string().max(200).optional(),
  serviceFrequency: z.string().max(100).optional(),
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

// Configure multer for document uploads.
// Memory storage so we can stream the buffer to GCS (Cloud Run filesystem is ephemeral).
// Legacy disk uploads (older rows with `/uploads/comercial/...` URLs) are still served
// from local disk as a fallback during the migration window.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyUploadsDir = path.resolve(__dirname, "../../../dist/uploads/comercial");

const upload = multer({
  storage: multer.memoryStorage(),
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
    // Surface the real DB error message so the client (and Vero/Cristina
    // cuando debuggen) vea POR QUÉ falla, no un genérico 500. Un FK violation
    // típico se ve como 'foreign key constraint' + nombre de la columna.
    const msg = getErrorMessage(error);
    res.status(500).json({ message: "No se pudo crear el prospecto", detail: msg });
  }
});

router.patch("/prospects/:id", async (req, res) => {
  try {
    const allowed = insertProspectSchema.partial().safeParse(req.body);
    if (!allowed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: allowed.error.errors });
    }
    const updated = await updateProspect(Number(req.params.id), allowed.data, req.user?.id);
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
    const validReason = reasons.find((r) => r.id === parsed.data.rejectionReasonId);
    if (!validReason) {
      return res.status(400).json({ message: "Motivo de rechazo inválido" });
    }
    const updated = await rejectProspect(
      Number(req.params.id),
      parsed.data.rejectionReasonId,
      parsed.data.rejectionDetail || "",
      req.user?.id,
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
    const updated = await qualifyProspect(Number(req.params.id), parsed.data, req.user?.id);
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

router.post("/prospects/:id/send-to-operaciones", requireRole("admin", "comercial", "director"), async (req, res) => {
  try {
    const result = await sendProspectToOperaciones(Number(req.params.id), req.user!.id);
    res.json(result);
  } catch (error) {
    console.error("[comercial] Send to operaciones error:", error);
    const msg = getErrorMessage(error);
    if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Prospecto no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
    if (msg.startsWith("VALIDATION:")) return res.status(400).json({ message: msg.slice(11) });
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

// Partial update of a meeting row — used by the inline-edit UI. Validates
// only the keys the caller sends (safeParse of a partial schema), so the
// client can save one field at a time.
router.patch("/prospects/:prospectId/meetings/:meetingId", async (req, res) => {
  try {
    const parsed = insertMeetingSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.errors });
    }
    const data = parsed.data as Parameters<typeof updateMeeting>[1];
    const updated = await updateMeeting(Number(req.params.meetingId), data);
    if (!updated) return res.status(404).json({ message: "Reunion no encontrada" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update meeting error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/prospects/:prospectId/meetings/:meetingId", async (req, res) => {
  try {
    const deleted = await deleteMeeting(Number(req.params.meetingId));
    if (!deleted) return res.status(404).json({ message: "Reunion no encontrada" });
    res.json({ success: true });
  } catch (error) {
    console.error("[comercial] Delete meeting error:", error);
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

router.patch("/prospects/:prospectId/proposals/:proposalId/amount", async (req, res) => {
  try {
    const amount = req.body.amount;
    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ message: "Monto inválido" });
    }
    const updated = await updateProposalAmount(Number(req.params.proposalId), String(amount));
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update proposal amount error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Generic PATCH for any proposal field — utilidad, recipient, notes,
// validUntil. Frontend (ProspectProposals inline edit) lo usa para guardar
// campo por campo.
const updateProposalFieldsSchema = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  utilidad: z.union([z.string(), z.number()]).optional(),
  recipientName: z.string().max(200).nullable().optional(),
  recipientRole: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  validUntil: z.string().nullable().optional(),
});

router.patch("/prospects/:prospectId/proposals/:proposalId", async (req, res) => {
  try {
    const parsed = updateProposalFieldsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const payload = parsed.data as Parameters<typeof updateProposal>[1];
    // Normalizar numbers a string para campos numeric
    const data: Record<string, unknown> = { ...payload };
    if (data.amount !== undefined && data.amount !== null) data.amount = String(data.amount);
    if (data.utilidad !== undefined && data.utilidad !== null) data.utilidad = String(data.utilidad);
    if (data.validUntil && typeof data.validUntil === "string") data.validUntil = new Date(data.validUntil);
    const updated = await updateProposal(Number(req.params.proposalId), data as Parameters<typeof updateProposal>[1]);
    if (!updated) return res.status(404).json({ message: "Propuesta no encontrada" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update proposal error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Proposal File Upload (20MB limit) ---

const proposalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max for proposals
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Usa PDF, Word, Excel, PowerPoint o imágenes."));
    }
  },
});

router.post("/prospects/:id/proposals/upload", proposalUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Archivo requerido" });
    }

    const prospectId = Number(req.params.id);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;

    let storedUrl: string;
    if (gcsEnabled) {
      const objectKey = `comercial/${prospectId}/${filename}`;
      await uploadBuffer(objectKey, file.buffer, file.mimetype);
      storedUrl = objectKey;
    } else {
      const dest = path.join(legacyUploadsDir, String(prospectId), filename);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, file.buffer);
      storedUrl = `/uploads/comercial/${prospectId}/${filename}`;
    }

    // Get next version number
    const existing = await getProposalVersions(prospectId);
    const nextVersion =
      existing.length > 0 ? Math.max(...existing.map((p: { version: number | null }) => p.version || 1)) + 1 : 1;

    const proposal = await createProposal({
      prospectId,
      name: file.originalname,
      url: storedUrl,
      version: nextVersion,
      createdById: req.user!.id,
    });

    res.status(201).json(proposal);
  } catch (error) {
    console.error("[comercial] Upload proposal error:", error);
    res.status(500).json({ message: getErrorMessage(error) });
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

// --- Stage Transitions (time-in-stage metrics) ---

router.get("/prospects/:id/stage-transitions", async (req, res) => {
  try {
    const rows = await getStageTransitions(Number(req.params.id));
    res.json(rows);
  } catch (error) {
    console.error("[comercial] Stage transitions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/reports/stage-durations", async (_req, res) => {
  try {
    const rows = await getAverageDurationByStage();
    res.json(rows);
  } catch (error) {
    console.error("[comercial] Stage durations report error:", error);
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

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;

    let storedUrl: string;
    if (gcsEnabled) {
      const objectKey = `comercial/${prospectId}/${filename}`;
      await uploadBuffer(objectKey, file.buffer, file.mimetype);
      storedUrl = objectKey;
    } else {
      const dest = path.join(legacyUploadsDir, String(prospectId), filename);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, file.buffer);
      storedUrl = `/uploads/comercial/${prospectId}/${filename}`;
    }

    const document = await createDocument({
      prospectId,
      name: file.originalname,
      type: tipo,
      url: storedUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedById: req.user!.id,
    });

    // If it's an OC and user wants to mark as closed
    if (tipo === "orden_compra" && markAsClosed) {
      await updateProspect(prospectId, { stage: STAGE.CIERRE_GANADO }, req.user?.id);
    }

    res.status(201).json(document);
  } catch (error) {
    console.error("[comercial] Upload document error:", error);
    res.status(500).json({ message: "Error al subir archivo" });
  }
});

// Serve uploaded files. Modern path → 302 redirect to short-lived signed URL.
// Legacy disk path kept as fallback during migration.
router.get("/uploads/:prospectId/:filename", async (req, res) => {
  try {
    const { prospectId, filename } = req.params;

    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ message: "Nombre de archivo inválido" });
    }

    const legacyPath = path.resolve(legacyUploadsDir, prospectId, filename);
    const legacyBase = legacyUploadsDir.endsWith(path.sep) ? legacyUploadsDir : legacyUploadsDir + path.sep;
    if (legacyPath.startsWith(legacyBase) && fs.existsSync(legacyPath)) {
      return res.sendFile(legacyPath);
    }

    if (!gcsEnabled) {
      return res.status(404).json({ message: "Archivo no encontrado" });
    }
    const key = `comercial/${prospectId}/${filename}`;
    const signedUrl = await getSignedReadUrl(key, 15 * 60);
    res.redirect(302, signedUrl);
  } catch (error) {
    console.error("[comercial] Serve file error:", error);
    res.status(404).json({ message: "Archivo no encontrado" });
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
      report = await upsertWeeklyReport(req.user!.id, weekStart, content || "");
    } else if (content !== undefined) {
      report = await upsertWeeklyReport(req.user!.id, weekStart, content);
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
    if (!(from && to)) return res.status(400).json({ message: "Parámetros 'from' y 'to' requeridos" });
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
  responsibleUserId: z.number().int().positive().optional(),
  dueDate: z.string().nullable().optional(),
});

router.get("/commitments/calendar", async (req, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!(from && to)) return res.status(400).json({ message: "from y to requeridos" });
    const commitments = await getCommitmentsInRange(from, to);
    res.json(commitments);
  } catch (error) {
    console.error("[comercial] Get commitments calendar error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
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
      responsibleUserId: parsed.data.responsibleUserId || undefined,
      createdById: req.user!.id,
    });

    // Notify assigned user via n8n webhook
    if (parsed.data.responsibleUserId) {
      const webhookUrl = process.env.N8N_WEBHOOK_COMPROMISO_URL;
      if (webhookUrl) {
        try {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, parsed.data.responsibleUserId),
            columns: { name: true, email: true },
          });
          if (assignee?.email) {
            await triggerWebhook(webhookUrl, {
              to: assignee.email,
              assigneeName: assignee.name,
              description: parsed.data.description,
              dueDate: parsed.data.dueDate || null,
              weekStart: parsed.data.weekStart,
              assignedBy: req.user!.name || "Comercial",
              subject: `Nuevo compromiso asignado — ${parsed.data.description.substring(0, 50)}`,
            });
          }
        } catch (webhookErr) {
          console.error("[comercial] Commitment webhook failed (non-blocking):", webhookErr);
        }
      }
    }

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

const commitmentUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  responsible: z.string().min(1).max(100).optional(),
  responsibleUserId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

router.patch("/commitments/:id", async (req, res) => {
  try {
    const parsed = commitmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
    const updated = await updateCommitment(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Compromiso no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[comercial] Update commitment error:", error);
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

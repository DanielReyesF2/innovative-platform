import { Router } from "express";
import { z } from "zod";
import {
  insertDocumentSchema,
  insertGateConfigSchema,
  insertSurveyPhotoSchema,
  insertSurveyProposalEquipmentSchema,
  insertSurveyProposalPersonnelSchema,
  insertSurveyProposalRentalsSchema,
  insertSurveyProposalSuppliesSchema,
  insertSurveySchema,
  insertSurveyServiceSchema,
  insertSurveySubproductSchema,
  insertSurveyWasteTypeSchema,
} from "../../../shared/schema/operaciones";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getErrorMessage } from "../../utils/errors";
import {
  acceptSurvey,
  addSurveyWasteType,
  advanceSurveyStatus,
  checkGateCompleteness,
  createDocument,
  createGateConfig,
  createProposalEquipment,
  createProposalPersonnel,
  createProposalRentals,
  createProposalSupplies,
  createSurvey,
  createSurveyFromProspect,
  createSurveyPhoto,
  createSurveyService,
  createSurveySubproduct,
  deleteDocument,
  deleteProposalEquipment,
  deleteProposalPersonnel,
  deleteProposalRentals,
  deleteProposalSupplies,
  deleteSurveyPhoto,
  deleteSurveyService,
  deleteSurveySubproduct,
  getDocumentById,
  // Documents
  getDocuments,
  getExpiredDocuments,
  getExpiringDocuments,
  // Gate config
  getGateConfigs,
  getOpsTeamStats,
  getPendingReviewSurveys,
  getSurveyById,
  // Photos
  getSurveyPhotos,
  // Proposal Equipment
  getSurveyProposalEquipment,
  // Proposal Personnel
  getSurveyProposalPersonnel,
  // Proposal Rentals
  getSurveyProposalRentals,
  // Proposal Supplies
  getSurveyProposalSupplies,
  // Services
  getSurveyServicesItems,
  // Subproducts
  getSurveySubproducts,
  getSurveySummary,
  getSurveys,
  getSurveysByStatus,
  rejectSurvey,
  updateDocument,
  updateGateConfig,
  updateProposalEquipment,
  updateProposalPersonnel,
  updateProposalRentals,
  updateProposalSupplies,
  updateSurvey,
  updateSurveyPhoto,
  updateSurveySection,
  updateSurveyService,
  updateSurveySubproduct,
} from "./storage";

export const router = Router();

router.use(requireAuth);

// ─── Team Dashboard ─────────────────────────────────────

router.get("/team", async (_req, res) => {
  try {
    const stats = await getOpsTeamStats();
    res.json(stats);
  } catch (error) {
    console.error("[operaciones] Get team stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Surveys (Levantamientos) ───────────────────────────

router.get("/surveys", async (_req, res) => {
  try {
    const surveys = await getSurveys();
    res.json(surveys);
  } catch (error) {
    console.error("[operaciones] Get surveys error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Handoff: Pending review, Accept, Reject ---

const acceptSurveySchema = z.object({
  scheduledDate: z.string().min(1, "Fecha requerida"),
  assignedToId: z.number().int().positive("Operador requerido"),
  schedulingNotes: z.string().max(500).optional(),
});

const rejectSurveySchema = z.object({
  rejectionReason: z.string().min(10, "Motivo debe tener al menos 10 caracteres").max(1000),
});

router.get("/surveys/pending-review", requireRole("admin", "director", "operaciones"), async (_req, res) => {
  try {
    const surveys = await getPendingReviewSurveys();
    res.json(surveys);
  } catch (error) {
    console.error("[operaciones] Get pending review surveys error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/accept", requireRole("admin", "director", "operaciones"), async (req, res) => {
  try {
    const parsed = acceptSurveySchema.parse(req.body);
    const updated = await acceptSurvey(
      Number(req.params.id),
      {
        scheduledDate: new Date(parsed.scheduledDate),
        assignedToId: parsed.assignedToId,
        schedulingNotes: parsed.schedulingNotes,
      },
      req.user!.id,
    );
    res.json(updated);
  } catch (error: unknown) {
    console.error("[operaciones] Accept survey error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    const msg = getErrorMessage(error);
    if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Levantamiento no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/reject", requireRole("admin", "director", "operaciones"), async (req, res) => {
  try {
    const parsed = rejectSurveySchema.parse(req.body);
    const result = await rejectSurvey(Number(req.params.id), parsed.rejectionReason, req.user!.id);
    res.json(result);
  } catch (error: unknown) {
    console.error("[operaciones] Reject survey error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    const msg = getErrorMessage(error);
    if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Levantamiento no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/surveys/summary", async (_req, res) => {
  try {
    const summary = await getSurveySummary();
    res.json(summary);
  } catch (error) {
    console.error("[operaciones] Get survey summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/surveys/status/:status", async (req, res) => {
  try {
    const surveys = await getSurveysByStatus(req.params.status);
    res.json(surveys);
  } catch (error) {
    console.error("[operaciones] Get surveys by status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/surveys/:id", async (req, res) => {
  try {
    const survey = await getSurveyById(Number(req.params.id));
    if (!survey) return res.status(404).json({ message: "Levantamiento no encontrado" });
    res.json(survey);
  } catch (error) {
    console.error("[operaciones] Get survey error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create survey — supports both direct creation and from-prospect
router.post("/surveys", async (req, res) => {
  try {
    const { prospectId, assignedCommercialId } = req.body;

    if (prospectId) {
      const userId = assignedCommercialId || req.user?.id;
      const survey = await createSurveyFromProspect(prospectId, userId);
      return res.status(201).json(survey);
    }

    const body = { ...req.body };
    if (body.scheduledDate && typeof body.scheduledDate === "string") body.scheduledDate = new Date(body.scheduledDate);
    if (body.completedDate && typeof body.completedDate === "string") body.completedDate = new Date(body.completedDate);
    const parsed = insertSurveySchema.parse(body);
    const survey = await createSurvey(parsed);
    res.status(201).json(survey);
  } catch (error: unknown) {
    console.error("[operaciones] Create survey error:", error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
});

router.patch("/surveys/:id", async (req, res) => {
  try {
    const parsed = insertSurveySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateSurvey(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Levantamiento no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update survey error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Section JSONB update ───────────────────────────────

const validSectionNames = [
  "installations",
  "personnelPolicies",
  "transportPolicies",
  "allowedEquipment",
  "legalRequirements",
  "operationArea",
] as const;

router.patch("/surveys/:id/section/:name", async (req, res) => {
  try {
    const sectionName = req.params.name;
    if (!(validSectionNames as readonly string[]).includes(sectionName)) {
      return res
        .status(400)
        .json({ message: `Sección inválida: ${sectionName}. Secciones válidas: ${validSectionNames.join(", ")}` });
    }
    const updated = await updateSurveySection(Number(req.params.id), sectionName, req.body);
    res.json(updated);
  } catch (error: unknown) {
    console.error("[operaciones] Update section error:", error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
});

// ─── Gate status ────────────────────────────────────────

router.get("/surveys/:id/gate-status", async (req, res) => {
  try {
    const gateName = (req.query.gate as string) || "phase1";
    const result = await checkGateCompleteness(Number(req.params.id), gateName);
    res.json(result);
  } catch (error: unknown) {
    console.error("[operaciones] Gate status error:", error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
});

// ─── Status advancement ─────────────────────────────────

const advanceStatusSchema = z.object({ targetStatus: z.string().min(1) });

router.post("/surveys/:id/advance", async (req, res) => {
  try {
    const parsed = advanceStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "targetStatus requerido", errors: parsed.error.errors });
    }

    const result = await advanceSurveyStatus(Number(req.params.id), parsed.data.targetStatus);
    if (!result.success) {
      return res.status(422).json(result);
    }
    res.json(result);
  } catch (error: unknown) {
    console.error("[operaciones] Advance status error:", error);
    res.status(400).json({ message: getErrorMessage(error) });
  }
});

// ─── Waste types (legacy) ───────────────────────────────

router.post("/surveys/:id/waste-types", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyWasteTypeSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    // Strip null values — storage function expects undefined, not null
    const { surveyId, wasteType, quantity, percentage, currentDestination, monthlyCost } = parsed.data;
    const wt = await addSurveyWasteType({
      surveyId,
      wasteType,
      ...(quantity != null && { quantity }),
      ...(percentage != null && { percentage }),
      ...(currentDestination != null && { currentDestination }),
      ...(monthlyCost != null && { monthlyCost }),
    });
    res.status(201).json(wt);
  } catch (error) {
    console.error("[operaciones] Add waste type error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ─── Photos (Section 8) ────────────────────────────────

router.get("/surveys/:id/photos", async (req, res) => {
  try {
    const photos = await getSurveyPhotos(Number(req.params.id));
    res.json(photos);
  } catch (error) {
    console.error("[operaciones] Get photos error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/photos", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyPhotoSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const photo = await createSurveyPhoto(parsed.data);
    res.status(201).json(photo);
  } catch (error) {
    console.error("[operaciones] Create photo error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/photos/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveyPhotoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateSurveyPhoto(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update photo error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/photos/:itemId", async (req, res) => {
  try {
    await deleteSurveyPhoto(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete photo error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Subproducts (Section 13) ───────────────────────────

router.get("/surveys/:id/subproducts", async (req, res) => {
  try {
    const items = await getSurveySubproducts(Number(req.params.id));
    res.json(items);
  } catch (error) {
    console.error("[operaciones] Get subproducts error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/subproducts", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveySubproductSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const item = await createSurveySubproduct(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("[operaciones] Create subproduct error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/subproducts/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveySubproductSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateSurveySubproduct(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update subproduct error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/subproducts/:itemId", async (req, res) => {
  try {
    await deleteSurveySubproduct(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete subproduct error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Services (Section 14) ──────────────────────────────

router.get("/surveys/:id/services", async (req, res) => {
  try {
    const items = await getSurveyServicesItems(Number(req.params.id));
    res.json(items);
  } catch (error) {
    console.error("[operaciones] Get services error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/services", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyServiceSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const item = await createSurveyService(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("[operaciones] Create service error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/services/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveyServiceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateSurveyService(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update service error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/services/:itemId", async (req, res) => {
  try {
    await deleteSurveyService(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete service error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Proposal Personnel (Section 9) ─────────────────────

router.get("/surveys/:id/proposal-personnel", async (req, res) => {
  try {
    const items = await getSurveyProposalPersonnel(Number(req.params.id));
    res.json(items);
  } catch (error) {
    console.error("[operaciones] Get proposal personnel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/proposal-personnel", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyProposalPersonnelSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const item = await createProposalPersonnel(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("[operaciones] Create proposal personnel error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/proposal-personnel/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveyProposalPersonnelSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateProposalPersonnel(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update proposal personnel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/proposal-personnel/:itemId", async (req, res) => {
  try {
    await deleteProposalPersonnel(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete proposal personnel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Proposal Equipment (Section 10) ────────────────────

router.get("/surveys/:id/proposal-equipment", async (req, res) => {
  try {
    const items = await getSurveyProposalEquipment(Number(req.params.id));
    res.json(items);
  } catch (error) {
    console.error("[operaciones] Get proposal equipment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/proposal-equipment", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyProposalEquipmentSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const item = await createProposalEquipment(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("[operaciones] Create proposal equipment error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/proposal-equipment/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveyProposalEquipmentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateProposalEquipment(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update proposal equipment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/proposal-equipment/:itemId", async (req, res) => {
  try {
    await deleteProposalEquipment(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete proposal equipment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Proposal Supplies (Section 11) ─────────────────────

router.get("/surveys/:id/proposal-supplies", async (req, res) => {
  try {
    const items = await getSurveyProposalSupplies(Number(req.params.id));
    res.json(items);
  } catch (error) {
    console.error("[operaciones] Get proposal supplies error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/proposal-supplies", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyProposalSuppliesSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const item = await createProposalSupplies(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("[operaciones] Create proposal supplies error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/proposal-supplies/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveyProposalSuppliesSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateProposalSupplies(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update proposal supplies error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/proposal-supplies/:itemId", async (req, res) => {
  try {
    await deleteProposalSupplies(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete proposal supplies error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Proposal Rentals (Section 12) ──────────────────────

router.get("/surveys/:id/proposal-rentals", async (req, res) => {
  try {
    const items = await getSurveyProposalRentals(Number(req.params.id));
    res.json(items);
  } catch (error) {
    console.error("[operaciones] Get proposal rentals error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/proposal-rentals", async (req, res) => {
  try {
    const data = { ...req.body, surveyId: Number(req.params.id) };
    const parsed = insertSurveyProposalRentalsSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const item = await createProposalRentals(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("[operaciones] Create proposal rentals error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id/proposal-rentals/:itemId", async (req, res) => {
  try {
    const parsed = insertSurveyProposalRentalsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateProposalRentals(Number(req.params.itemId), parsed.data);
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update proposal rentals error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/surveys/:id/proposal-rentals/:itemId", async (req, res) => {
  try {
    await deleteProposalRentals(Number(req.params.itemId));
    res.json({ message: "Eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete proposal rentals error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Gate Config Admin ──────────────────────────────────

router.get("/gate-configs", async (_req, res) => {
  try {
    const configs = await getGateConfigs();
    res.json(configs);
  } catch (error) {
    console.error("[operaciones] Get gate configs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/gate-configs", async (req, res) => {
  try {
    const parsed = insertGateConfigSchema.parse(req.body);
    const config = await createGateConfig(parsed);
    res.status(201).json(config);
  } catch (error) {
    console.error("[operaciones] Create gate config error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/gate-configs/:id", async (req, res) => {
  try {
    const parsed = insertGateConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateGateConfig(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Config no encontrada" });
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update gate config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── Documents ──────────────────────────────────────────

router.get("/documents", async (_req, res) => {
  try {
    const documents = await getDocuments();
    res.json(documents);
  } catch (error) {
    console.error("[operaciones] Get documents error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/documents/expiring", async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const documents = await getExpiringDocuments(days);
    res.json(documents);
  } catch (error) {
    console.error("[operaciones] Get expiring documents error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/documents/expired", async (_req, res) => {
  try {
    const documents = await getExpiredDocuments();
    res.json(documents);
  } catch (error) {
    console.error("[operaciones] Get expired documents error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/documents/:id", async (req, res) => {
  try {
    const doc = await getDocumentById(Number(req.params.id));
    if (!doc) return res.status(404).json({ message: "Documento no encontrado" });
    res.json(doc);
  } catch (error) {
    console.error("[operaciones] Get document error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.issueDate && typeof body.issueDate === "string") body.issueDate = new Date(body.issueDate);
    if (body.expirationDate && typeof body.expirationDate === "string")
      body.expirationDate = new Date(body.expirationDate);
    const parsed = insertDocumentSchema.parse(body);
    const doc = await createDocument(parsed);
    res.status(201).json(doc);
  } catch (error) {
    console.error("[operaciones] Create document error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/documents/:id", async (req, res) => {
  try {
    const parsed = insertDocumentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }
    const updated = await updateDocument(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Documento no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update document error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    await deleteDocument(Number(req.params.id));
    res.json({ message: "Documento eliminado" });
  } catch (error) {
    console.error("[operaciones] Delete document error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

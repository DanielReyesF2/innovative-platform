import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import {
  getSurveys,
  getSurveyById,
  getSurveysByStatus,
  createSurvey,
  updateSurvey,
  completeSurvey,
  addSurveyWasteType,
  getDocuments,
  getDocumentById,
  getExpiringDocuments,
  getExpiredDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getSurveySummary,
} from "./storage";
import { insertSurveySchema, insertDocumentSchema } from "../../../shared/schema/operaciones";

export const router = Router();

router.use(requireAuth);

// --- Surveys (Levantamientos) ---

router.get("/surveys", async (_req, res) => {
  try {
    const surveys = await getSurveys();
    res.json(surveys);
  } catch (error) {
    console.error("[operaciones] Get surveys error:", error);
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

router.post("/surveys", async (req, res) => {
  try {
    const parsed = insertSurveySchema.parse(req.body);
    const survey = await createSurvey(parsed);
    res.status(201).json(survey);
  } catch (error) {
    console.error("[operaciones] Create survey error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/surveys/:id", async (req, res) => {
  try {
    const updated = await updateSurvey(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Levantamiento no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Update survey error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/complete", async (req, res) => {
  try {
    const updated = await completeSurvey(Number(req.params.id));
    if (!updated) return res.status(404).json({ message: "Levantamiento no encontrado" });
    res.json(updated);
  } catch (error) {
    console.error("[operaciones] Complete survey error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/surveys/:id/waste-types", async (req, res) => {
  try {
    const wt = await addSurveyWasteType({
      surveyId: Number(req.params.id),
      ...req.body,
    });
    res.status(201).json(wt);
  } catch (error) {
    console.error("[operaciones] Add waste type error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// --- Documents ---

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
    const parsed = insertDocumentSchema.parse(req.body);
    const doc = await createDocument(parsed);
    res.status(201).json(doc);
  } catch (error) {
    console.error("[operaciones] Create document error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/documents/:id", async (req, res) => {
  try {
    const updated = await updateDocument(Number(req.params.id), req.body);
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

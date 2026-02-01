import { db } from "../../db";
import { eq, desc, and, lte, gte, sql } from "drizzle-orm";
import {
  surveys,
  surveyWasteTypes,
  surveyCurrentServices,
  surveyInfrastructure,
  surveyNeeds,
  operationalDocuments,
  type InsertSurvey,
  type InsertDocument,
} from "../../../shared/schema/operaciones";

// --- Surveys ---

export async function getSurveys() {
  return db.query.surveys.findMany({
    orderBy: [desc(surveys.scheduledDate)],
  });
}

export async function getSurveyById(id: number) {
  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.id, id),
  });
  if (!survey) return null;

  const wasteTypes = await db.query.surveyWasteTypes.findMany({
    where: eq(surveyWasteTypes.surveyId, id),
  });

  const currentServices = await db.query.surveyCurrentServices.findFirst({
    where: eq(surveyCurrentServices.surveyId, id),
  });

  const infrastructure = await db.query.surveyInfrastructure.findFirst({
    where: eq(surveyInfrastructure.surveyId, id),
  });

  const needs = await db.query.surveyNeeds.findFirst({
    where: eq(surveyNeeds.surveyId, id),
  });

  return { ...survey, wasteTypes, currentServices, infrastructure, needs };
}

export async function getSurveysByStatus(status: string) {
  return db.query.surveys.findMany({
    where: eq(surveys.status, status as any),
    orderBy: [desc(surveys.scheduledDate)],
  });
}

export async function createSurvey(data: InsertSurvey) {
  const [survey] = await db.insert(surveys).values(data).returning();
  return survey;
}

export async function updateSurvey(id: number, data: Partial<InsertSurvey>) {
  const [updated] = await db
    .update(surveys)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(surveys.id, id))
    .returning();
  return updated;
}

export async function completeSurvey(id: number) {
  const [updated] = await db
    .update(surveys)
    .set({
      status: "completado",
      completedDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(surveys.id, id))
    .returning();
  return updated;
}

// --- Survey waste types ---

export async function addSurveyWasteType(data: {
  surveyId: number;
  wasteType: string;
  quantity?: string;
  percentage?: number;
  currentDestination?: string;
  monthlyCost?: string;
}) {
  const [wt] = await db.insert(surveyWasteTypes).values(data).returning();
  return wt;
}

// --- Documents ---

export async function getDocuments() {
  return db.query.operationalDocuments.findMany({
    orderBy: [desc(operationalDocuments.expirationDate)],
  });
}

export async function getDocumentById(id: number) {
  return db.query.operationalDocuments.findFirst({
    where: eq(operationalDocuments.id, id),
  });
}

export async function getExpiringDocuments(daysAhead: number = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);

  return db
    .select()
    .from(operationalDocuments)
    .where(
      and(
        lte(operationalDocuments.expirationDate, futureDate),
        gte(operationalDocuments.expirationDate, now)
      )
    );
}

export async function getExpiredDocuments() {
  return db
    .select()
    .from(operationalDocuments)
    .where(lte(operationalDocuments.expirationDate, new Date()));
}

export async function createDocument(data: InsertDocument) {
  const [doc] = await db.insert(operationalDocuments).values(data).returning();
  return doc;
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const [updated] = await db
    .update(operationalDocuments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(operationalDocuments.id, id))
    .returning();
  return updated;
}

export async function deleteDocument(id: number) {
  await db.delete(operationalDocuments).where(eq(operationalDocuments.id, id));
}

// --- Summary stats ---

export async function getSurveySummary() {
  const statuses = ["agendado", "en_proceso", "completado"];
  const results: Record<string, number> = {};

  for (const status of statuses) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(surveys)
      .where(eq(surveys.status, status as any));
    results[status] = row.count;
  }

  return results;
}

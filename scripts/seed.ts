import "dotenv/config";
import { db } from "../server/db";
import {
  surveys,
  surveySubproducts,
  surveyServices,
  surveyProposalPersonnel,
  surveyProposalEquipment,
  surveyProposalSupplies,
  surveyProposalRentals,
  surveyGateConfigs,
  operationalDocuments,
} from "../shared/schema/operaciones";
import { rejectionReasons } from "../shared/schema/comercial";
import operacionesData from "./data/operaciones.json";
import comercialData from "./data/comercial.json";

async function seed() {
  console.log("Seeding operaciones data...");

  // 1. Seed surveys
  console.log(`  Inserting ${operacionesData.surveys.length} surveys...`);
  const insertedSurveys = [];
  for (const surveyData of operacionesData.surveys) {
    const [survey] = await db.insert(surveys).values({
      clientName: surveyData.clientName,
      prospectId: surveyData.prospectId,
      siteType: surveyData.siteType || null,
      siteTypeOther: (surveyData as any).siteTypeOther || null,
      address: surveyData.address || null,
      status: surveyData.status as any,
      type: surveyData.type,
      estimatedVolume: surveyData.estimatedVolume || null,
      estimatedValue: surveyData.estimatedValue || null,
      scheduledDate: surveyData.scheduledDate ? new Date(surveyData.scheduledDate) : null,
      completedDate: surveyData.completedDate ? new Date(surveyData.completedDate) : null,
      observations: surveyData.observations || null,
      installations: surveyData.installations || null,
      personnelPolicies: surveyData.personnelPolicies || null,
      transportPolicies: surveyData.transportPolicies || null,
      allowedEquipment: surveyData.allowedEquipment || null,
      legalRequirements: surveyData.legalRequirements || null,
      operationArea: surveyData.operationArea || null,
      phase1CompletedAt: surveyData.phase1CompletedAt ? new Date(surveyData.phase1CompletedAt) : null,
      phase2CompletedAt: surveyData.phase2CompletedAt ? new Date(surveyData.phase2CompletedAt) : null,
    }).returning();
    insertedSurveys.push(survey);
    console.log(`    ✓ Survey: ${survey.clientName} (ID: ${survey.id})`);
  }

  // 2. Seed subproducts
  for (const group of operacionesData.subproducts) {
    const surveyId = insertedSurveys[group.surveyIndex].id;
    console.log(`  Inserting ${group.items.length} subproducts for survey ${surveyId}...`);
    for (const item of group.items) {
      await db.insert(surveySubproducts).values({
        surveyId,
        itemNumber: item.itemNumber,
        name: item.name,
        um: item.um,
        monthlyQty: item.monthlyQty,
        characteristics: item.characteristics || null,
        collectionFrequency: item.collectionFrequency || null,
        transportRequired: item.transportRequired ?? false,
        storage: item.storage || null,
      });
    }
  }

  // 3. Seed services
  for (const group of operacionesData.services) {
    const surveyId = insertedSurveys[group.surveyIndex].id;
    console.log(`  Inserting ${group.items.length} services for survey ${surveyId}...`);
    for (const item of group.items) {
      await db.insert(surveyServices).values({
        surveyId,
        itemNumber: item.itemNumber,
        serviceName: item.serviceName,
        characteristic: item.characteristic || null,
        um: item.um,
        monthlyQty: item.monthlyQty,
        collectionFrequency: item.collectionFrequency || null,
        equipmentRequired: item.equipmentRequired || null,
        suggestedTreatment: item.suggestedTreatment || null,
      });
    }
  }

  // 4. Seed proposal personnel
  for (const group of operacionesData.proposalPersonnel) {
    const surveyId = insertedSurveys[group.surveyIndex].id;
    console.log(`  Inserting ${group.items.length} proposal personnel for survey ${surveyId}...`);
    for (const item of group.items) {
      await db.insert(surveyProposalPersonnel).values({
        surveyId,
        role: item.role,
        quantity: item.quantity,
        schedule: item.schedule || null,
        observations: item.observations || null,
      });
    }
  }

  // 5. Seed proposal equipment
  for (const group of operacionesData.proposalEquipment) {
    const surveyId = insertedSurveys[group.surveyIndex].id;
    console.log(`  Inserting ${group.items.length} proposal equipment for survey ${surveyId}...`);
    for (const item of group.items) {
      await db.insert(surveyProposalEquipment).values({
        surveyId,
        item: item.item,
        quantity: item.quantity,
        observations: item.observations || null,
      });
    }
  }

  // 6. Seed proposal supplies
  for (const group of operacionesData.proposalSupplies) {
    const surveyId = insertedSurveys[group.surveyIndex].id;
    console.log(`  Inserting ${group.items.length} proposal supplies for survey ${surveyId}...`);
    for (const item of group.items) {
      await db.insert(surveyProposalSupplies).values({
        surveyId,
        item: item.item,
        quantity: item.quantity,
        observations: item.observations || null,
      });
    }
  }

  // 7. Seed proposal rentals
  for (const group of operacionesData.proposalRentals) {
    const surveyId = insertedSurveys[group.surveyIndex].id;
    console.log(`  Inserting ${group.items.length} proposal rentals for survey ${surveyId}...`);
    for (const item of group.items) {
      await db.insert(surveyProposalRentals).values({
        surveyId,
        item: item.item,
        quantity: item.quantity,
        observations: item.observations || null,
      });
    }
  }

  // 8. Seed gate configurations
  console.log(`  Inserting ${operacionesData.gateConfigs.length} gate configurations...`);
  for (const config of operacionesData.gateConfigs) {
    await db.insert(surveyGateConfigs).values({
      gate: config.gate,
      section: config.section,
      fieldPath: config.fieldPath,
      label: config.label,
      fieldType: config.fieldType,
      isRequired: true,
    });
  }

  // 9. Seed documents
  console.log(`  Inserting ${operacionesData.documents.length} documents...`);
  for (const doc of operacionesData.documents) {
    await db.insert(operationalDocuments).values({
      name: doc.name,
      type: doc.type,
      category: doc.category,
      issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
      expirationDate: doc.expirationDate ? new Date(doc.expirationDate) : null,
      status: doc.status as any,
      notes: doc.notes || null,
    });
  }

  // 10. Seed rejection reasons (idempotent — insert missing ones)
  const existingReasons = await db.query.rejectionReasons.findMany();
  const existingReasonTexts = new Set(existingReasons.map((r: any) => r.reason));
  const missingReasons = comercialData.rejectionReasons.filter(
    (r: any) => !existingReasonTexts.has(r.reason)
  );
  if (missingReasons.length > 0) {
    console.log(`  Inserting ${missingReasons.length} new rejection reasons...`);
    for (const reason of missingReasons) {
      await db.insert(rejectionReasons).values({
        reason: reason.reason,
        category: reason.category,
      });
    }
  } else {
    console.log(`  All rejection reasons already exist (${existingReasons.length}), skipping.`);
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

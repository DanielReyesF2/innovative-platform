import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";
import { db } from "../server/db";
import { companies, areas, users } from "../shared/schema/common";
import {
  rejectionReasons, prospects, leads, salesMetrics,
} from "../shared/schema/comercial";
import {
  operationalDocuments, surveys, surveyWasteTypes,
  surveyCurrentServices, surveyInfrastructure, surveyNeeds,
} from "../shared/schema/operaciones";
import {
  serviceClients, traceabilityRecords, clientReports,
} from "../shared/schema/subproductos";

// ── Helpers ──────────────────────────────────────────────────────────

function load<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(import.meta.dirname, "data", file), "utf-8"));
}

function d(iso: string | null): Date | null {
  return iso ? new Date(iso) : null;
}

const userMap = new Map<string, number>();   // email → id
const areaMap = new Map<string, number>();   // name  → id
const clientMap = new Map<string, number>(); // name  → id
const rejMap = new Map<string, number>();    // reason → id
const counts: Record<string, number> = {};

function inc(key: string, n = 1) { counts[key] = (counts[key] || 0) + n; }

// ── 1. Company & Areas ──────────────────────────────────────────────

async function seedCompanyAndAreas(data: any) {
  console.log("[1/8] Empresa y areas...");
  const existing = await db.select().from(companies).where(eq(companies.name, data.company));
  const companyId = existing.length
    ? existing[0].id
    : (await db.insert(companies).values({ name: data.company }).returning())[0].id;

  for (const name of data.areas as string[]) {
    const row = await db.select().from(areas).where(eq(areas.name, name));
    if (row.length) { areaMap.set(name, row[0].id); continue; }
    const [a] = await db.insert(areas).values({ name, companyId }).returning();
    areaMap.set(name, a.id);
  }
  console.log(`   ✓ ${data.company} — ${data.areas.length} areas`);
}

// ── 2. Users ────────────────────────────────────────────────────────

async function seedUsers(data: any) {
  console.log("[2/8] Usuarios...");
  // Pre-load existing users
  for (const u of await db.select().from(users)) userMap.set(u.email, u.id);

  for (const u of data.users) {
    if (userMap.has(u.email)) continue;
    const pw = await bcrypt.hash(u.password || "Innovative2026!", 10);
    const [created] = await db.insert(users).values({
      name: u.name, email: u.email, password: pw,
      role: u.role, areaId: areaMap.get(u.area) ?? null, isActive: true,
    }).returning();
    userMap.set(u.email, created.id);
    inc("users");
  }
  console.log(`   ✓ ${inc.length} total, ${counts.users || 0} nuevos (${userMap.size} en sistema)`);
}

// ── 3. Rejection Reasons ────────────────────────────────────────────

async function seedRejectionReasons(data: any) {
  console.log("[3/8] Motivos de rechazo...");
  for (const r of data.rejectionReasons) {
    const existing = await db.select().from(rejectionReasons)
      .where(eq(rejectionReasons.reason, r.reason));
    if (existing.length) { rejMap.set(r.reason, existing[0].id); continue; }
    const [created] = await db.insert(rejectionReasons)
      .values({ reason: r.reason, category: r.category }).returning();
    rejMap.set(r.reason, created.id);
    inc("rejectionReasons");
  }
  console.log(`   ✓ ${rejMap.size} motivos`);
}

// ── 4. Prospects ────────────────────────────────────────────────────

async function seedProspects(data: any) {
  console.log("[4/8] Prospectos...");
  for (const p of data.prospects) {
    const existing = await db.select().from(prospects).where(eq(prospects.name, p.name));
    if (existing.length) continue;

    await db.insert(prospects).values({
      name: p.name, industry: p.industry, location: p.location,
      potential: p.potential, estimatedVolume: p.estimatedVolume,
      estimatedValue: p.estimatedValue?.toString(),
      probability: p.probability, stage: p.stage,
      contactName: p.contactName, contactRole: p.contactRole,
      contactPhone: p.contactPhone, contactEmail: p.contactEmail,
      priority: p.priority,
      assignedToId: userMap.get(p.assignedTo) ?? null,
      nextStep: p.nextStep, estimatedCloseTime: p.estimatedCloseTime,
      lastActivity: p.lastActivity, reason: p.reason,
      risk: p.risk ?? null, opportunity: p.opportunity ?? null,
      rejectionReasonId: p.rejectionReason ? (rejMap.get(p.rejectionReason) ?? null) : null,
      rejectionDetail: p.rejectionDetail ?? null,
      rejectionDate: p.rejectionReason ? new Date() : null,
    });
    inc("prospects");
  }
  console.log(`   ✓ ${counts.prospects || 0} prospectos`);
}

// ── 5. Leads ────────────────────────────────────────────────────────

async function seedLeads(data: any) {
  console.log("[5/8] Leads...");
  for (const l of data.leads) {
    const existing = await db.select().from(leads)
      .where(eq(leads.companyName, l.companyName));
    if (existing.length) continue;

    await db.insert(leads).values({
      companyName: l.companyName, contactName: l.contactName,
      contactRole: l.contactRole, source: l.source,
      estimatedValue: l.estimatedValue?.toString(),
      industry: l.industry, location: l.location,
    });
    inc("leads");
  }
  console.log(`   ✓ ${counts.leads || 0} leads`);
}

// ── 6. Documents & Surveys ──────────────────────────────────────────

async function seedOperaciones(data: any) {
  console.log("[6/8] Operaciones (documentos + levantamientos)...");

  // Documents
  for (const doc of data.documents) {
    const existing = await db.select().from(operationalDocuments)
      .where(eq(operationalDocuments.name, doc.name));
    if (existing.length) continue;

    const now = new Date();
    const exp = d(doc.expirationDate);
    let status: "vigente" | "por_vencer" | "vencido" = "vigente";
    if (exp) {
      const daysLeft = (exp.getTime() - now.getTime()) / 86400000;
      if (daysLeft < 0) status = "vencido";
      else if (daysLeft < 90) status = "por_vencer";
    }

    await db.insert(operationalDocuments).values({
      name: doc.name, type: doc.type, category: doc.category,
      issueDate: d(doc.issueDate), expirationDate: exp, status,
    });
    inc("documents");
  }

  // Surveys with sub-tables
  for (const s of data.surveys) {
    const existing = await db.select().from(surveys)
      .where(eq(surveys.clientName, s.clientName));
    if (existing.length) continue;

    const [survey] = await db.insert(surveys).values({
      clientName: s.clientName, scheduledDate: new Date(s.scheduledDate),
      completedDate: d(s.completedDate), status: s.status, type: s.type,
      assignedToId: userMap.get(s.assignedTo) ?? null,
      estimatedVolume: s.estimatedVolume,
      estimatedValue: s.estimatedValue?.toString(),
      hasReport: s.hasReport ?? false,
      generalInfo: s.generalInfo, observations: s.observations,
    }).returning();
    inc("surveys");

    // Waste types
    if (s.wasteTypes?.length) {
      for (const wt of s.wasteTypes) {
        await db.insert(surveyWasteTypes).values({
          surveyId: survey.id, wasteType: wt.wasteType,
          quantity: wt.quantity, percentage: wt.percentage,
          currentDestination: wt.currentDestination,
          monthlyCost: wt.monthlyCost?.toString(),
        });
      }
    }

    // Current services
    if (s.currentServices) {
      const cs = s.currentServices;
      await db.insert(surveyCurrentServices).values({
        surveyId: survey.id, providerName: cs.providerName,
        contractActive: cs.contractActive,
        contractStart: d(cs.contractStart ?? null),
        contractEnd: d(cs.contractEnd ?? null),
        monthlyCost: cs.monthlyCost?.toString(),
        collectionFrequency: cs.collectionFrequency,
        serviceType: cs.serviceType,
        includesSeparation: cs.includesSeparation,
        includesValorization: cs.includesValorization,
        includesReporting: cs.includesReporting,
        satisfactionLevel: cs.satisfactionLevel,
        reasonForChange: cs.reasonForChange,
      });
    }

    // Infrastructure
    if (s.infrastructure) {
      const inf = s.infrastructure;
      await db.insert(surveyInfrastructure).values({
        surveyId: survey.id, hasStorageArea: inf.hasStorageArea,
        storageAreaSize: inf.storageAreaSize, storageType: inf.storageType,
        containerCount: inf.containerCount, hasCompactor: inf.hasCompactor,
        hasWarehouse: inf.hasWarehouse, vehicleAccess: inf.vehicleAccess,
        scheduleRestrictions: inf.scheduleRestrictions,
        availableSpace: inf.availableSpace,
      });
    }

    // Needs
    if (s.needs) {
      const n = s.needs;
      await db.insert(surveyNeeds).values({
        surveyId: survey.id, needsSeparation: n.needsSeparation,
        needsValorization: n.needsValorization,
        needsTraceability: n.needsTraceability,
        needsMonthlyReporting: n.needsMonthlyReporting,
        certifications: n.certifications,
        environmentalGoals: n.environmentalGoals,
        availableBudget: n.availableBudget?.toString(),
        urgency: n.urgency, decisionMaker: n.decisionMaker,
      });
    }
  }

  console.log(`   ✓ ${counts.documents || 0} documentos, ${counts.surveys || 0} levantamientos`);
}

// ── 7. Service Clients & Traceability ───────────────────────────────

async function seedSubproductos(data: any) {
  console.log("[7/8] Subproductos (clientes + trazabilidad)...");

  // Service clients
  for (const c of data.serviceClients) {
    const existing = await db.select().from(serviceClients)
      .where(eq(serviceClients.name, c.name));
    if (existing.length) { clientMap.set(c.name, existing[0].id); continue; }

    const [created] = await db.insert(serviceClients).values({
      name: c.name, branchCount: c.branchCount,
      contactName: c.contactName, contactEmail: c.contactEmail,
      operationStartDate: d(c.operationStartDate),
      monthlyAverage: c.monthlyAverage?.toString(),
      servicesContracted: c.servicesContracted,
      wasteTypes: c.wasteTypes,
      collectionFrequency: c.collectionFrequency,
      valorizationRate: c.valorizationRate?.toString(),
      reportRequirements: c.reportRequirements,
      recyclingDestination: c.recyclingDestination,
      compostDestination: c.compostDestination,
      reuseDestination: c.reuseDestination,
      landfillDestination: c.landfillDestination,
      recyclingRegistry: c.recyclingRegistry,
      compostRegistry: c.compostRegistry,
      reuseRegistry: c.reuseRegistry,
      landfillRegistry: c.landfillRegistry,
    }).returning();
    clientMap.set(c.name, created.id);
    inc("clients");
  }

  // Traceability records
  for (const t of data.traceabilityRecords) {
    const clientId = clientMap.get(t.client);
    if (!clientId) { console.log(`   ⚠ Cliente no encontrado: ${t.client}`); continue; }

    const existing = await db.select().from(traceabilityRecords)
      .where(and(
        eq(traceabilityRecords.clientId, clientId),
        eq(traceabilityRecords.period, t.period),
      ));
    if (existing.length) continue;

    await db.insert(traceabilityRecords).values({
      clientId, period: t.period,
      recyclingKg: t.recyclingKg?.toString(),
      compostKg: t.compostKg?.toString(),
      reuseKg: t.reuseKg?.toString(),
      landfillKg: t.landfillKg?.toString(),
      recyclingBreakdown: t.recyclingBreakdown,
      compostBreakdown: t.compostBreakdown,
      reuseBreakdown: t.reuseBreakdown,
      treesSaved: t.treesSaved,
      co2Avoided: t.co2Avoided?.toString(),
      waterSaved: t.waterSaved,
      monthlyRevenue: t.monthlyRevenue?.toString(),
    });
    inc("traceability");
  }

  // Client reports
  for (const r of data.clientReports) {
    const clientId = clientMap.get(r.client);
    if (!clientId) continue;

    const existing = await db.select().from(clientReports)
      .where(and(
        eq(clientReports.clientId, clientId),
        eq(clientReports.period, r.period),
      ));
    if (existing.length) continue;

    await db.insert(clientReports).values({
      clientId, period: r.period, status: r.status,
      sentDate: d(r.sentDate), confirmedDate: d(r.confirmedDate),
    });
    inc("reports");
  }

  console.log(`   ✓ ${counts.clients || 0} clientes, ${counts.traceability || 0} registros, ${counts.reports || 0} reportes`);
}

// ── 8. Sales Metrics ────────────────────────────────────────────────

async function seedSalesMetrics(data: any) {
  console.log("[8/8] Metricas comerciales...");
  for (const m of data.salesMetrics) {
    const userId = userMap.get(m.email);
    if (!userId) { console.log(`   ⚠ Usuario no encontrado: ${m.email}`); continue; }

    const existing = await db.select().from(salesMetrics)
      .where(and(eq(salesMetrics.userId, userId), eq(salesMetrics.period, m.period)));
    if (existing.length) continue;

    await db.insert(salesMetrics).values({
      userId, period: m.period,
      leads: m.leads, surveys: m.surveys,
      proposalsSent: m.proposalsSent, meetings: m.meetings,
      closedDeals: m.closedDeals,
      conversionRate: m.conversionRate?.toString(),
      monthlyBudget: m.monthlyBudget?.toString(),
      actualSales: m.actualSales?.toString(),
      budgetCompliance: m.budgetCompliance?.toString(),
      responseTime: m.responseTime,
      clientSatisfaction: m.clientSatisfaction?.toString(),
      weeklyActivities: m.weeklyActivities,
      globalEfficiency: m.globalEfficiency?.toString(),
    });
    inc("salesMetrics");
  }
  console.log(`   ✓ ${counts.salesMetrics || 0} registros`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   INNOVATIVE GROUP — Carga de Seed Data  ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const usersData = load("users.json");
  const comercialData = load("comercial.json");
  const operacionesData = load("operaciones.json");
  const subproductosData = load("subproductos.json");

  await seedCompanyAndAreas(usersData);
  await seedUsers(usersData);
  await seedRejectionReasons(comercialData);
  await seedProspects(comercialData);
  await seedLeads(comercialData);
  await seedOperaciones(operacionesData);
  await seedSubproductos(subproductosData);
  await seedSalesMetrics(comercialData);

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│               RESUMEN                    │");
  console.log("├──────────────────────────────────────────┤");
  for (const [key, val] of Object.entries(counts)) {
    console.log(`│  ${key.padEnd(25)} ${String(val).padStart(5)}  │`);
  }
  console.log("└──────────────────────────────────────────┘");
  console.log("\n✓ Seed completado. El sistema esta listo para usar.\n");
  console.log("Usuarios de prueba (password: Innovative2026!):");
  console.log("  admin@econova.mx          (admin)");
  for (const u of (usersData as any).users) {
    console.log(`  ${u.email.padEnd(30)} (${u.role})`);
  }
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Error durante seed:", err.message);
  process.exit(1);
});

/**
 * Limpieza: Eliminar TODOS los prospectos y datos relacionados.
 *
 * Borra en orden correcto para respetar foreign keys:
 * 1. Tablas hijas de surveys (waste_types, photos, etc.)
 * 2. Surveys
 * 3. Tablas hijas de prospects (activities, notes, meetings, docs, proposals)
 * 4. Follow-up alerts
 * 5. Leads (nullify converted_to_prospect_id)
 * 6. Prospects
 */
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== Limpieza de Prospectos ===\n");

  // Count before
  const countResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM prospects`);
  const prospectCount = (countResult as any).rows?.[0]?.count ?? (countResult as any)[0]?.count ?? 0;
  console.log(`Prospectos actuales: ${prospectCount}\n`);

  if (Number(prospectCount) === 0) {
    console.log("No hay prospectos que eliminar.");
    process.exit(0);
  }

  // Delete in correct FK order
  const tables = [
    // Survey children first
    "survey_waste_types",
    "survey_current_services",
    "survey_photos",
    "survey_proposal_personnel",
    "survey_proposal_equipment",
    "survey_proposal_supplies",
    "survey_proposal_rentals",
    "survey_subproducts",
    "survey_services",
    // Surveys (linked to prospects)
    "surveys",
    // Prospect children
    "prospect_activities",
    "prospect_notes",
    "prospect_meetings",
    "prospect_documents",
    "proposal_versions",
    "follow_up_alerts",
    // Leads - nullify prospect reference
    // (don't delete leads, just unlink)
  ];

  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`DELETE FROM ${table}`));
      console.log(`  ✓ ${table} — limpiado`);
    } catch (err: any) {
      // Table might not exist yet
      if (err.message?.includes("does not exist")) {
        console.log(`  - ${table} — no existe, saltando`);
      } else {
        console.log(`  ⚠ ${table} — ${err.message}`);
      }
    }
  }

  // Nullify leads.converted_to_prospect_id
  try {
    await db.execute(sql`UPDATE leads SET converted_to_prospect_id = NULL WHERE converted_to_prospect_id IS NOT NULL`);
    console.log("  ✓ leads — referencias a prospectos eliminadas");
  } catch (err: any) {
    if (!err.message?.includes("does not exist")) {
      console.log(`  ⚠ leads — ${err.message}`);
    }
  }

  // Finally delete prospects
  const deleted = await db.execute(sql`DELETE FROM prospects`);
  console.log(`\n✅ ${prospectCount} prospectos eliminados con todos sus datos relacionados.`);

  // Verify
  const verifyResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM prospects`);
  const remaining = (verifyResult as any).rows?.[0]?.count ?? (verifyResult as any)[0]?.count ?? 0;
  console.log(`\nVerificación: ${remaining} prospectos restantes.`);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

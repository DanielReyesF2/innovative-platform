import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const TABLES_TO_TRUNCATE = [
  // Operaciones sub-tables (must be truncated before surveys due to FK)
  "survey_proposal_rentals",
  "survey_proposal_supplies",
  "survey_proposal_equipment",
  "survey_proposal_personnel",
  "survey_services",
  "survey_subproducts",
  "survey_photos",
  "survey_current_services",
  "survey_waste_types",
  "survey_gate_configs",
  "operational_documents",
  // Main surveys table
  "surveys",
  // Comercial tables
  "sales_metrics",
  "pipeline_snapshots",
  "leads",
  "prospects",
  "rejection_reasons",
  // Common tables (except users)
  "areas",
  "companies",
];

async function resetDb() {
  console.log("Resetting database tables...");

  for (const table of TABLES_TO_TRUNCATE) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
      console.log(`  ✓ Truncated: ${table}`);
    } catch (error: any) {
      // Table might not exist yet
      if (error.message?.includes("does not exist")) {
        console.log(`  - Skipped (not found): ${table}`);
      } else {
        console.error(`  ✗ Error truncating ${table}:`, error.message);
      }
    }
  }

  // Reset sequences
  console.log("Resetting sequences...");
  for (const table of TABLES_TO_TRUNCATE) {
    try {
      await db.execute(sql.raw(`ALTER SEQUENCE IF EXISTS "${table}_id_seq" RESTART WITH 1`));
    } catch {
      // Sequence might not exist
    }
  }

  console.log("Database reset complete!");
  process.exit(0);
}

resetDb().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});

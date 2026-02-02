import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("Truncating all tables...");
  await db.execute(sql`TRUNCATE TABLE
    sales_metrics, pipeline_snapshots, leads, prospects, rejection_reasons,
    service_conciliations, economic_models, client_reports, traceability_records, service_clients,
    survey_needs, survey_infrastructure, survey_current_services, survey_waste_types, surveys,
    operational_documents, users, areas, companies
    CASCADE`);
  console.log("Done — all tables empty.");
  process.exit(0);
}

reset().catch(console.error);

import "dotenv/config";
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("[migrate-handoff] Starting handoff comercial → operaciones migration...");

  // Prospect columns
  console.log("[migrate-handoff] Adding columns to prospects...");
  await db.execute(sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS survey_id integer`);
  await db.execute(sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS levantamiento_data jsonb`);
  await db.execute(sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS sent_to_ops_at timestamp`);
  await db.execute(sql`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS sent_to_ops_by_id integer REFERENCES users(id)`);

  // Survey columns
  console.log("[migrate-handoff] Adding columns to surveys...");
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS prospect_id integer`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS sent_by_id integer REFERENCES users(id)`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS rejection_reason text`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS rejected_by_id integer REFERENCES users(id)`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS rejected_at timestamp`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS accepted_by_id integer REFERENCES users(id)`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS accepted_at timestamp`);
  await db.execute(sql`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS scheduling_notes text`);

  // Make scheduledDate nullable (was NOT NULL, now surveys can exist without a date in pendiente_revision)
  console.log("[migrate-handoff] Making scheduled_date nullable...");
  await db.execute(sql`ALTER TABLE surveys ALTER COLUMN scheduled_date DROP NOT NULL`);

  // Expand survey_status enum
  console.log("[migrate-handoff] Expanding survey_status enum...");
  await db.execute(sql`ALTER TYPE survey_status ADD VALUE IF NOT EXISTS 'pendiente_revision' BEFORE 'agendado'`);
  await db.execute(sql`ALTER TYPE survey_status ADD VALUE IF NOT EXISTS 'rechazado' AFTER 'cancelado'`);

  // Indexes for handoff queries
  console.log("[migrate-handoff] Creating indexes...");
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_surveys_prospect_id ON surveys(prospect_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_prospects_survey_id ON prospects(survey_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(stage)`);

  console.log("[migrate-handoff] Done.");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[migrate-handoff] Error:", err);
  process.exit(1);
});

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function migrate() {
  console.log("Starting progressive lead migration...");

  // 1. Add 'prospecto' to prospect_stage enum
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "prospect_stage" ADD VALUE IF NOT EXISTS 'prospecto' AFTER 'lead';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ Added 'prospecto' to prospect_stage enum");

  // 2. Add 'source' column to prospects table
  await db.execute(sql`
    ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "source" "lead_source" DEFAULT 'otro';
  `);
  console.log("✓ Added 'source' column to prospects");

  // 3. Migrate existing leads to prospects
  const existingLeads = await db.execute(sql`
    SELECT * FROM "leads" WHERE "is_active" = true AND "converted_to_prospect_id" IS NULL
  `);

  let migratedCount = 0;
  for (const lead of existingLeads.rows) {
    await db.execute(sql`
      INSERT INTO "prospects" ("name", "contact_name", "location", "source", "industry", "stage", "potential", "probability", "priority")
      VALUES (
        ${(lead as any).company_name},
        ${(lead as any).contact_name},
        ${(lead as any).location || 'Sin ubicación'},
        ${(lead as any).source || 'otro'},
        ${(lead as any).industry || null},
        'lead',
        'Medio',
        0,
        'media'
      )
    `);
    migratedCount++;
  }
  console.log(`✓ Migrated ${migratedCount} leads to prospects`);

  // 4. Add index on source column
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "idx_prospects_source" ON "prospects"("source");
  `);
  console.log("✓ Created index on prospects.source");

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

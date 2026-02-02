import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";

neonConfig.webSocketConstructor = WebSocket;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    // Update survey_status enum to add new values
    console.log("Updating survey_status enum...");
    const enumCheck = await client.query(`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'survey_status'
    `);
    const existingLabels = enumCheck.rows.map((r: any) => r.enumlabel);
    console.log("  Existing enum values:", existingLabels);

    const newLabels = ["borrador_comercial", "pendiente_operaciones", "agendado", "en_sitio", "completado", "cancelado"];
    for (const label of newLabels) {
      if (!existingLabels.includes(label)) {
        await client.query(`ALTER TYPE survey_status ADD VALUE IF NOT EXISTS '${label}'`);
        console.log(`  Added enum value: ${label}`);
      }
    }

    // Add new columns to surveys table
    console.log("\nAdding new columns to surveys table...");
    const addColumnIfNotExists = async (col: string, type: string, extra: string = "") => {
      try {
        await client.query(`ALTER TABLE surveys ADD COLUMN IF NOT EXISTS "${col}" ${type} ${extra}`);
        console.log(`  Added column: ${col}`);
      } catch (e: any) {
        if (e.code === "42701") { // column already exists
          console.log(`  Column ${col} already exists, skipping`);
        } else {
          throw e;
        }
      }
    };

    await addColumnIfNotExists("prospect_id", "integer", "REFERENCES prospects(id)");
    await addColumnIfNotExists("site_type", "text");
    await addColumnIfNotExists("site_type_other", "text");
    await addColumnIfNotExists("address", "text");
    await addColumnIfNotExists("installations", "jsonb");
    await addColumnIfNotExists("personnel_policies", "jsonb");
    await addColumnIfNotExists("transport_policies", "jsonb");
    await addColumnIfNotExists("allowed_equipment", "jsonb");
    await addColumnIfNotExists("legal_requirements", "jsonb");
    await addColumnIfNotExists("operation_area", "jsonb");
    await addColumnIfNotExists("assigned_commercial_id", "integer", "REFERENCES users(id)");
    await addColumnIfNotExists("assigned_operations_id", "integer", "REFERENCES users(id)");
    await addColumnIfNotExists("elaborated_by_id", "integer", "REFERENCES users(id)");
    await addColumnIfNotExists("approved_by_id", "integer", "REFERENCES users(id)");
    await addColumnIfNotExists("observations", "text");
    await addColumnIfNotExists("phase1_completed_at", "timestamp");
    await addColumnIfNotExists("phase2_completed_at", "timestamp");
    await addColumnIfNotExists("has_report", "boolean", "DEFAULT false");

    // Make scheduled_date nullable (it was NOT NULL before)
    console.log("\nMaking scheduled_date nullable...");
    await client.query(`ALTER TABLE surveys ALTER COLUMN scheduled_date DROP NOT NULL`).catch(() => {
      console.log("  scheduled_date already nullable or doesn't exist");
    });

    // Create new tables
    console.log("\nCreating new tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_photos (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        caption TEXT,
        section TEXT,
        sort_order INTEGER DEFAULT 0,
        uploaded_by_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("  Created: survey_photos");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_proposal_personnel (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        schedule TEXT,
        observations TEXT
      )
    `);
    console.log("  Created: survey_proposal_personnel");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_proposal_equipment (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        observations TEXT
      )
    `);
    console.log("  Created: survey_proposal_equipment");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_proposal_supplies (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        observations TEXT
      )
    `);
    console.log("  Created: survey_proposal_supplies");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_proposal_rentals (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        item TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        observations TEXT
      )
    `);
    console.log("  Created: survey_proposal_rentals");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_subproducts (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        item_number INTEGER,
        name TEXT NOT NULL,
        um TEXT,
        monthly_qty NUMERIC,
        characteristics TEXT,
        image_url TEXT,
        collection_frequency TEXT,
        transport_required TEXT,
        storage TEXT
      )
    `);
    console.log("  Created: survey_subproducts");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_services (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        item_number INTEGER,
        service_name TEXT NOT NULL,
        characteristic TEXT,
        um TEXT,
        monthly_qty NUMERIC,
        image_url TEXT,
        collection_frequency TEXT,
        equipment_required TEXT,
        suggested_treatment TEXT
      )
    `);
    console.log("  Created: survey_services");

    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_gate_configs (
        id SERIAL PRIMARY KEY,
        gate TEXT NOT NULL DEFAULT 'phase1',
        section TEXT NOT NULL,
        field_path TEXT NOT NULL,
        label TEXT NOT NULL,
        field_type TEXT NOT NULL DEFAULT 'text',
        is_required BOOLEAN NOT NULL DEFAULT true
      )
    `);
    console.log("  Created: survey_gate_configs");

    console.log("\n✅ Migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

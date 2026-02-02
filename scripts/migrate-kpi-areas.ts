import "dotenv/config";
import { db, pool } from "../server/db";
import { areas } from "../shared/schema/common";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("[migrate] Adding module_slug column to areas...");

  // Add column if not exists
  await db.execute(
    sql`ALTER TABLE areas ADD COLUMN IF NOT EXISTS module_slug text`
  );

  console.log("[migrate] Column added (or already exists).");

  // Seed default areas with moduleSlug if they don't exist
  const defaultAreas = [
    { name: "Comercial", moduleSlug: "comercial" },
    { name: "Operaciones", moduleSlug: "operaciones" },
    { name: "Subproductos", moduleSlug: "subproductos" },
  ];

  for (const area of defaultAreas) {
    const existing = await db.query.areas.findFirst({
      where: eq(areas.moduleSlug, area.moduleSlug),
    });

    if (!existing) {
      // Check if area exists by name but without moduleSlug
      const byName = await db.query.areas.findFirst({
        where: eq(areas.name, area.name),
      });

      if (byName) {
        await db
          .update(areas)
          .set({ moduleSlug: area.moduleSlug })
          .where(eq(areas.id, byName.id));
        console.log(`[migrate] Updated area "${area.name}" with moduleSlug="${area.moduleSlug}"`);
      } else {
        await db.insert(areas).values(area);
        console.log(`[migrate] Created area "${area.name}" with moduleSlug="${area.moduleSlug}"`);
      }
    } else {
      console.log(`[migrate] Area with moduleSlug="${area.moduleSlug}" already exists.`);
    }
  }

  console.log("[migrate] Done.");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[migrate] Error:", err);
  process.exit(1);
});

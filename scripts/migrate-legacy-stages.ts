import "dotenv/config";
import { db } from "../server/db";
import { prospects } from "../shared/schema/comercial";
import { eq } from "drizzle-orm";

// Migrate legacy stage enum values to current ones
// 'lead' → 'contacto_inicial', 'prospecto' → 'presentacion',
// 'cierre' → 'cierre_ganado', 'rechazada' → 'cierre_perdido'
const MIGRATIONS: Record<string, string> = {
  lead: "contacto_inicial",
  prospecto: "presentacion",
  cierre: "cierre_ganado",
  rechazada: "cierre_perdido",
};

async function main() {
  const allProspects = await db.query.prospects.findMany();

  let migrated = 0;
  for (const p of allProspects) {
    const newStage = MIGRATIONS[p.stage];
    if (newStage) {
      await db
        .update(prospects)
        .set({ stage: newStage as any, updatedAt: new Date() })
        .where(eq(prospects.id, p.id));
      console.log(`  ${p.name}: ${p.stage} → ${newStage}`);
      migrated++;
    }
  }

  console.log(`Done. Migrated ${migrated} prospects.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

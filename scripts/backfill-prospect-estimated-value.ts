import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  // Para cada prospecto cuyo estimatedValue sea NULL pero que tenga al menos una
  // propuesta con amount, copia el amount de la propuesta más reciente.
  // Preferencia: aceptada > última editada.
  const result = await db.execute(sql`
    UPDATE prospects p
    SET
      estimated_value = sub.amount,
      updated_at = NOW()
    FROM (
      SELECT DISTINCT ON (prospect_id)
        prospect_id,
        amount
      FROM proposal_versions
      WHERE amount IS NOT NULL
      ORDER BY
        prospect_id,
        CASE WHEN status = 'aceptada' THEN 0 ELSE 1 END,
        updated_at DESC
    ) AS sub
    WHERE p.id = sub.prospect_id
      AND (p.estimated_value IS NULL OR p.estimated_value = 0)
  `);
  console.log(`Backfilled estimated_value for prospects from proposal amounts`, result);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

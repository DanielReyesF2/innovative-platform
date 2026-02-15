import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema/common";
import { salesMetrics } from "../shared/schema/comercial";
import { eq, and } from "drizzle-orm";

const ENERO_DATA = [
  {
    email: "ccruz@ig-la.com",
    name: "Carmen Rodriguez",
    surveys: 3,
    proposalsSent: 1,
    meetings: 0,
  },
  {
    email: "csescosse@ig-la.com",
    name: "Cristina Sescosse",
    surveys: 0,
    proposalsSent: 0,
    meetings: 4,
  },
  {
    email: "lmesa@ig-la.com",
    name: "Laura Mesa Caballero",
    surveys: 0,
    proposalsSent: 2,
    meetings: 0,
  },
  {
    email: "molmos@ig-la.com",
    name: "Marian Olmos",
    surveys: 3,
    proposalsSent: 1,
    meetings: 0,
  },
];

const PERIOD = "2026-01";

async function run() {
  console.log("=== Actualizando datos de Enero 2026 ===\n");

  // Clean up duplicate Marian Olmos created earlier (ID 17 with wrong email)
  const [dup] = await db
    .select()
    .from(users)
    .where(eq(users.email, "marian@innovative-la.com"));
  if (dup) {
    // Delete any metrics for the duplicate first
    await db.delete(salesMetrics).where(eq(salesMetrics.userId, dup.id));
    await db.delete(users).where(eq(users.id, dup.id));
    console.log(`  ✓ Eliminado usuario duplicado: Marian Olmos (ID: ${dup.id}, marian@innovative-la.com)\n`);
  }

  for (const member of ENERO_DATA) {
    // 1. Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, member.email));

    if (!user) {
      console.log(`  ✗ Usuario no encontrado: ${member.email} — omitiendo`);
      continue;
    }

    // Update name if different
    if (user.name !== member.name) {
      await db
        .update(users)
        .set({ name: member.name })
        .where(eq(users.id, user.id));
      console.log(`  ✓ Nombre actualizado: "${user.name}" → "${member.name}"`);
    }

    // 2. Upsert sales metrics for 2026-01
    const [existing] = await db
      .select()
      .from(salesMetrics)
      .where(
        and(
          eq(salesMetrics.userId, user.id),
          eq(salesMetrics.period, PERIOD)
        )
      );

    if (existing) {
      await db
        .update(salesMetrics)
        .set({
          surveys: member.surveys,
          proposalsSent: member.proposalsSent,
          meetings: member.meetings,
        })
        .where(eq(salesMetrics.id, existing.id));
      console.log(`  ✓ Métricas actualizadas para ${member.name} (${PERIOD})`);
    } else {
      await db.insert(salesMetrics).values({
        userId: user.id,
        period: PERIOD,
        leads: 0,
        surveys: member.surveys,
        proposalsSent: member.proposalsSent,
        meetings: member.meetings,
        closedDeals: 0,
      });
      console.log(`  ✓ Métricas creadas para ${member.name} (${PERIOD})`);
    }

    console.log(`    Propuestas: ${member.proposalsSent} | Levantamientos: ${member.surveys} | Reuniones: ${member.meetings}\n`);
  }

  console.log("=== Listo! Datos de enero 2026 integrados ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

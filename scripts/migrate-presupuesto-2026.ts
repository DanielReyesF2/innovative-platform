/**
 * Migración: Presupuesto Anual 2026 — $130,130,812 MXN
 *
 * Inserta los 12 meses de presupuesto en sales_metrics para cada ejecutivo.
 * El presupuesto mensual del equipo se divide equitativamente entre los 6 ejecutivos.
 * Vero (directora, código VA) NO tiene presupuesto individual — ella ve el total del equipo.
 */
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema/common";
import { salesMetrics } from "../shared/schema/comercial";
import { eq, and } from "drizzle-orm";

// Presupuesto mensual TOTAL del equipo (los 6 ejecutivos)
const MONTHLY_BUDGETS_2026: Record<number, number> = {
  1:  2_774_200,   // Enero
  2:  2_769_810,   // Febrero
  3:  4_009_709,   // Marzo
  4:  11_011_618,  // Abril
  5:  12_452_161,  // Mayo
  6:  14_121_018,  // Junio
  7:  14_216_418,  // Julio
  8:  15_603_961,  // Agosto
  9:  14_951_318,  // Septiembre
  10: 14_352_318,  // Octubre
  11: 13_006_777,  // Noviembre
  12: 10_861_507,  // Diciembre
};

const YEAR = 2026;
const NUM_EJECUTIVOS = 6;

// Emails of the 6 ejecutivos (NOT Vero — she's director)
const EJECUTIVO_EMAILS = [
  "ccruz@ig-la.com",      // Carmen Rodriguez
  "jamartinez@ig-la.com",  // Jose Armando Martínez
  "csescosse@ig-la.com",   // Cristina Sescosse
  "lmesa@ig-la.com",       // Laura Mesa Caballero
  "molmos@ig-la.com",      // Mariana Olmos
];

async function main() {
  console.log("=== Migración Presupuesto 2026 ===\n");

  const total = Object.values(MONTHLY_BUDGETS_2026).reduce((a, b) => a + b, 0);
  console.log(`Total anual equipo: $${total.toLocaleString("es-MX")}`);
  console.log(`Dividido entre ${NUM_EJECUTIVOS} ejecutivos\n`);

  // Find ejecutivos
  const allUsers = await db.query.users.findMany();
  const ejecutivos = EJECUTIVO_EMAILS.map(email => {
    const user = allUsers.find(u => u.email === email);
    if (!user) {
      console.error(`  ❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }
    return user;
  });

  console.log("Ejecutivos encontrados:");
  ejecutivos.forEach(u => console.log(`  ✓ ${u.name} (${u.email}, id=${u.id})`));
  console.log();

  let insertCount = 0;
  let updateCount = 0;

  for (const [mesStr, totalMes] of Object.entries(MONTHLY_BUDGETS_2026)) {
    const mes = Number(mesStr);
    const period = `${YEAR}-${String(mes).padStart(2, "0")}`;
    const perEjecutivo = Math.round(totalMes / NUM_EJECUTIVOS * 100) / 100; // Round to 2 decimal places

    console.log(`${period}: $${totalMes.toLocaleString("es-MX")} total → $${perEjecutivo.toLocaleString("es-MX")} c/u`);

    for (const user of ejecutivos) {
      // Check if record exists
      const existing = await db.query.salesMetrics.findFirst({
        where: and(
          eq(salesMetrics.userId, user.id),
          eq(salesMetrics.period, period),
        ),
      });

      if (existing) {
        // Update
        await db.update(salesMetrics)
          .set({ monthlyBudget: String(perEjecutivo) })
          .where(and(
            eq(salesMetrics.userId, user.id),
            eq(salesMetrics.period, period),
          ));
        updateCount++;
      } else {
        // Insert
        await db.insert(salesMetrics).values({
          userId: user.id,
          period,
          monthlyBudget: String(perEjecutivo),
        });
        insertCount++;
      }
    }
  }

  console.log(`\n✅ Completado: ${insertCount} insertados, ${updateCount} actualizados`);

  // Verify
  console.log("\n=== Verificación ===");
  for (const user of ejecutivos) {
    const rows = await db.query.salesMetrics.findMany({
      where: eq(salesMetrics.userId, user.id),
    });
    const annualBudget = rows
      .filter(r => r.period.startsWith(`${YEAR}-`))
      .reduce((sum, r) => sum + (Number(r.monthlyBudget) || 0), 0);
    console.log(`  ${user.name}: $${annualBudget.toLocaleString("es-MX")} anual (${rows.filter(r => r.period.startsWith(`${YEAR}-`)).length} meses)`);
  }

  const grandTotal = ejecutivos.reduce((sum, user) => {
    const rows = allUsers; // We need to re-query
    return sum;
  }, 0);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

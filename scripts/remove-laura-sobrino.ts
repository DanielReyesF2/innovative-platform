/**
 * Remove Laura Sobrino from the database.
 * She was removed from seed data but never deleted from the live DB.
 */
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema/common";
import { prospects, leads, prospectActivities, followUpAlerts, comercialWeeklyReports, salesMetrics } from "../shared/schema/comercial";
import { eq, like } from "drizzle-orm";

async function main() {
  console.log("Looking for Laura Sobrino in database...");

  const results = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(like(users.name, "%Sobrino%"));

  if (results.length === 0) {
    console.log("Laura Sobrino NOT found in database — already clean.");
    process.exit(0);
  }

  const user = results[0];
  console.log(`Found: ${user.name} (id=${user.id}, email=${user.email})`);

  // Check dependencies
  const deps = {
    prospects: (await db.select({ id: prospects.id }).from(prospects).where(eq(prospects.assignedToId, user.id))).length,
    leads: (await db.select({ id: leads.id }).from(leads).where(eq(leads.assignedToId, user.id))).length,
    activities: (await db.select({ id: prospectActivities.id }).from(prospectActivities).where(eq(prospectActivities.createdById, user.id))).length,
    weeklyReports: (await db.select({ id: comercialWeeklyReports.id }).from(comercialWeeklyReports).where(eq(comercialWeeklyReports.createdById, user.id))).length,
  };

  console.log("Dependencies:", deps);

  const totalDeps = Object.values(deps).reduce((a, b) => a + b, 0);

  if (totalDeps > 0) {
    console.log(`\nUser has ${totalDeps} dependent records. Cleaning up...`);

    if (deps.prospects > 0) {
      await db.update(prospects).set({ assignedToId: null }).where(eq(prospects.assignedToId, user.id));
      console.log(`  Nullified ${deps.prospects} prospect assignments`);
    }
    if (deps.leads > 0) {
      await db.update(leads).set({ assignedToId: null }).where(eq(leads.assignedToId, user.id));
      console.log(`  Nullified ${deps.leads} lead assignments`);
    }
    if (deps.weeklyReports > 0) {
      await db.delete(comercialWeeklyReports).where(eq(comercialWeeklyReports.createdById, user.id));
      console.log(`  Deleted ${deps.weeklyReports} weekly reports`);
    }
  }

  // Clean up related records
  await db.delete(followUpAlerts).where(eq(followUpAlerts.assignedToId, user.id));
  await db.delete(prospectActivities).where(eq(prospectActivities.createdById, user.id));
  await db.delete(salesMetrics).where(eq(salesMetrics.userId, user.id));

  // Delete the user
  await db.delete(users).where(eq(users.id, user.id));
  console.log(`\nDeleted user: ${user.name} (id=${user.id})`);

  // Verify
  const check = await db.select({ id: users.id }).from(users).where(like(users.name, "%Sobrino%"));
  console.log(`Verification: ${check.length === 0 ? "SUCCESS — user removed" : "FAILED — user still exists"}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

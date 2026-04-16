/**
 * Backfill: link existing weekly_commitments.responsible (text) to responsible_user_id (FK)
 *
 * Safe to re-run (idempotent) — only updates rows where responsible_user_id IS NULL.
 *
 * Usage: npx tsx scripts/backfill-commitment-users.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { weeklyCommitments } from "../shared/schema/comercial";
import { users } from "../shared/schema/common";
import { eq, isNull } from "drizzle-orm";

async function backfill() {
  // Get all users
  const allUsers = await db.query.users.findMany({
    columns: { id: true, name: true },
  });
  console.log(`Found ${allUsers.length} users`);

  // Get commitments without responsibleUserId
  const unlinked = await db.query.weeklyCommitments.findMany({
    where: isNull(weeklyCommitments.responsibleUserId),
  });
  console.log(`Found ${unlinked.length} commitments without responsibleUserId`);

  let matched = 0;
  const unmatched: string[] = [];

  for (const c of unlinked) {
    const responsibleLower = c.responsible.toLowerCase().trim();

    // Try exact match first
    let user = allUsers.find(u => u.name.toLowerCase() === responsibleLower);

    // Try partial match (first 2 words)
    if (!user) {
      const words = responsibleLower.split(/\s+/).slice(0, 2);
      user = allUsers.find(u => {
        const uWords = u.name.toLowerCase().split(/\s+/).slice(0, 2);
        return words.length >= 2 && uWords.length >= 2 &&
          words[0] === uWords[0] && words[1] === uWords[1];
      });
    }

    if (user) {
      await db.update(weeklyCommitments)
        .set({ responsibleUserId: user.id })
        .where(eq(weeklyCommitments.id, c.id));
      matched++;
      console.log(`  ✓ "${c.responsible}" → ${user.name} (id: ${user.id})`);
    } else {
      if (!unmatched.includes(c.responsible)) unmatched.push(c.responsible);
    }
  }

  console.log(`\nResults: ${matched} matched, ${unmatched.length} unmatched names`);
  if (unmatched.length > 0) {
    console.log("Unmatched:", unmatched.join(", "));
  }
  process.exit(0);
}

backfill().catch(err => {
  console.error("Backfill error:", err);
  process.exit(1);
});

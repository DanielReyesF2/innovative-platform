// One-time reconciliation of the role catalog to the canonical permissions
// (Opción B, Task 1.1). Run deliberately against an environment AFTER taking a
// backup (§5.5). Idempotent and reversible (re-run restores the baseline).
//
//   npx tsx scripts/reconcile-roles.ts
//
// What it does:
//   1. Upserts the canonical roles with their BASELINE permissions. This is a
//      one-time correction — run it before admins start tuning permissions in
//      the UI, since it overwrites permissions for the canonical roles.
//   2. Reports any users whose `role` is NOT in the canonical catalog. It does
//      NOT change users.role automatically (§5.5 — sensitive table); surface and
//      fix those by hand / via Settings once Task 1.4 ships.
//
// It does NOT delete the legacy "manager" role; the seed simply stopped creating
// it. Remove it by hand only after confirming no users reference it.

import "dotenv/config";
import { eq } from "drizzle-orm";
import { ROLE_META, ROLE_PERMISSIONS } from "../shared/auth/permissions";
import { users } from "../shared/schema/common";
import { roles } from "../shared/schema/settings";
import { db } from "../server/db";

async function main() {
  const canonical = Object.keys(ROLE_PERMISSIONS);

  console.log("Reconciliando roles canónicos a permisos baseline...");
  for (const name of canonical) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.name, name) });
    const values = {
      displayName: ROLE_META[name].displayName,
      description: ROLE_META[name].description,
      permissions: ROLE_PERMISSIONS[name],
    };
    if (existing) {
      await db.update(roles).set(values).where(eq(roles.name, name));
      console.log(`  actualizado: ${name} → [${ROLE_PERMISSIONS[name].join(", ")}]`);
    } else {
      await db.insert(roles).values({ name, ...values, isSystem: true });
      console.log(`  creado: ${name}`);
    }
  }

  // Report users with a role outside the canonical catalog — do NOT auto-change.
  const allUsers = await db.query.users.findMany();
  const offenders = allUsers.filter((u) => !canonical.includes(u.role));
  if (offenders.length > 0) {
    console.log("\n⚠️  Usuarios con rol fuera del catálogo (revisar manualmente):");
    for (const u of offenders) {
      console.log(`   ${u.name} <${u.email}> → role="${u.role}"`);
    }
  } else {
    console.log("\n✓ Todos los usuarios tienen un rol canónico.");
  }

  console.log("\nListo. (No se modificó ningún users.role automáticamente.)");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

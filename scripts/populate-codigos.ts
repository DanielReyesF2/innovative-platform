import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema/common";
import { eq } from "drizzle-orm";

const CODIGOS: Record<string, string> = {
  // Actual DB emails
  "varias@ig-la.com": "VA",
  "ccruz@ig-la.com": "CR",
  "jamartinez@ig-la.com": "AM",
  "lmesa@ig-la.com": "LM",
  "csescosse@ig-la.com": "CS",
  "molmos@ig-la.com": "MO",
  // Seed data emails (alternate)
  "vero@innovative-la.com": "VA",
  "carmen@innovative-la.com": "CR",
  "armando@innovative-la.com": "AM",
  "cristina@innovative-la.com": "CS",
};

async function main() {
  const allUsers = await db.query.users.findMany();

  for (const user of allUsers) {
    const codigo = CODIGOS[user.email];
    if (codigo) {
      await db.update(users).set({ codigo }).where(eq(users.id, user.id));
      console.log(`  ${user.name} (${user.email}) → ${codigo}`);
    }
  }

  // Set admin user codigo if exists
  const admin = allUsers.find(u => u.role === "admin" && !CODIGOS[u.email]);
  if (admin && !admin.codigo) {
    await db.update(users).set({ codigo: "ADM" }).where(eq(users.id, admin.id));
    console.log(`  ${admin.name} (admin) → ADM`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

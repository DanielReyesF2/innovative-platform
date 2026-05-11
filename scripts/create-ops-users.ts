import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema/common";

const OPS_USERS = [
  { name: "C. García", email: "cgarcia@ig-la.com", codigo: "CG" },
  { name: "I. Calderón", email: "icalderon@ig-la.com", codigo: "IC" },
  { name: "L. Escobedo", email: "lescobedo@ig-la.com", codigo: "LE" },
  { name: "M. Gómez", email: "mgomez@ig-la.com", codigo: "MG" },
  { name: "P. Martínez", email: "pmartinez@ig-la.com", codigo: "PM" },
  { name: "R. Lavalle", email: "rlavalle@ig-la.com", codigo: "RL" },
];

async function createOpsUsers() {
  const password = await bcrypt.hash("Innovative2026!", 10);

  for (const user of OPS_USERS) {
    try {
      const [created] = await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          password,
          role: "operaciones",
          codigo: user.codigo,
          isActive: true,
        })
        .returning();
      console.log(`✓ Created: ${created.name} (${created.email}) — ID: ${created.id}, código: ${user.codigo}`);
    } catch (error: any) {
      if (error.code === "23505") {
        console.log(`⊘ Already exists: ${user.email}`);
      } else {
        console.error(`✗ Error creating ${user.email}:`, error.message);
      }
    }
  }
  process.exit(0);
}

createOpsUsers().catch(console.error);

import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema/common";

const COMERCIAL_USERS = [
  {
    name: "Laura Mesa Caballero",
    email: "lmesa@ig-la.com",
    password: "Innovative2026!",
    role: "comercial",
  },
  {
    name: "Mariana Olmos",
    email: "molmos@ig-la.com",
    password: "Innovative2026!",
    role: "comercial",
  },
];

async function createComercialUsers() {
  for (const user of COMERCIAL_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    try {
      const [created] = await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          isActive: true,
        })
        .returning();
      console.log(`Created: ${created.name} (${created.email}) — ID: ${created.id}`);
    } catch (error: any) {
      if (error.code === "23505") {
        console.log(`Already exists: ${user.email}`);
      } else {
        console.error(`Error creating ${user.email}:`, error.message);
      }
    }
  }
  process.exit(0);
}

createComercialUsers().catch(console.error);

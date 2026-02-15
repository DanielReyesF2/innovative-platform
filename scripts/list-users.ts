import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema/common";

async function run() {
  const all = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users);
  console.table(all);
  process.exit(0);
}

run().catch(console.error);

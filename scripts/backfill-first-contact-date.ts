import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(
    sql`UPDATE prospects SET first_contact_date = created_at::date WHERE first_contact_date IS NULL`
  );
  console.log("Backfilled first_contact_date from created_at for existing prospects");
  process.exit(0);
}

main();

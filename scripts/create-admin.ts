import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema/common";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@econova.mx";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";

async function createAdmin() {
  console.log(`Creating admin user: ${ADMIN_EMAIL}`);

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  try {
    const [admin] = await db
      .insert(users)
      .values({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        isActive: true,
      })
      .returning();

    console.log(`Admin created with ID: ${admin.id}`);
  } catch (error: any) {
    if (error.code === "23505") {
      console.log("Admin user already exists");
    } else {
      throw error;
    }
  }

  process.exit(0);
}

createAdmin().catch(console.error);

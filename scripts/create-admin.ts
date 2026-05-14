import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { adminUsers } from "../db/schema";

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrateur";

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.");
  }

  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must contain at least 10 characters.");
  }

  const db = getDb();
  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  if (existing) {
    await db.update(adminUsers).set({ name, passwordHash, role: "super_admin", isActive: true }).where(eq(adminUsers.email, email));
    console.log(`Updated admin: ${email}`);
    return;
  }

  await db.insert(adminUsers).values({ name, email, passwordHash, role: "super_admin", isActive: true });
  console.log(`Created admin: ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

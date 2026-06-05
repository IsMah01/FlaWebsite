import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function fix() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    connectTimeout: 30000,
  });
  
  await conn.execute("DROP TABLE IF EXISTS editionImages");
  await conn.execute("DROP TABLE IF EXISTS editions");
  await conn.execute("DROP TABLE IF EXISTS contactMessages");
  await conn.execute("DROP TABLE IF EXISTS newsletterSubscribers");
  await conn.execute("DROP TABLE IF EXISTS candidates");
  await conn.execute("DROP TABLE IF EXISTS users");
  console.log("Dropped all tables");
  await conn.end();
  console.log("Done");
  process.exit(0);
}

fix().catch((e) => { console.error(e); process.exit(1); });

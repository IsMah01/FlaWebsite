import { getDb } from "../api/queries/connection";

async function fix() {
  const db = getDb();
  await db.execute("TRUNCATE TABLE candidates");
  console.log("Truncated candidates table");
  await db.execute("TRUNCATE TABLE editions");
  console.log("Truncated editions table");
}

fix().catch(console.error);

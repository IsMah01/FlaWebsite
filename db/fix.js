import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function fix() {
  const conn = await mysql.createConnection({
    uri: "mysql://3VCunU74WBNqxvn.root:sIfblZd6iJoR7K6yPfsBUlQhbH5Qq2Nx@ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com:4000/19dd0f14-99c2-83ec-8000-098342856cc7",
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

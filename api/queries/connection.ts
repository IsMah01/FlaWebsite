import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let pool: mysql.Pool;

export function getSqlPool() {
  if (!pool) {
    pool = mysql.createPool(env.databaseUrl);
  }
  return pool;
}

export function getDb() {
  if (!instance) {
    instance = drizzle(getSqlPool(), {
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance;
}

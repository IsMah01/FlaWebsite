import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    date: new Date(),
    ...data,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (values.status === undefined) {
    const resolvedStatus =
      values.role === "admin" || values.unionId?.startsWith("internal-admin-")
        ? "admin"
        : "user";
    values.status = resolvedStatus;
    updateSet.status = resolvedStatus;
  }

  await getDb()
    .insert(schema.users)
    .values({
      ...values,
      date: values.date ?? new Date(),
      lastSignInAt: values.lastSignInAt ?? new Date(),
    })
    .onDuplicateKeyUpdate({ set: updateSet });
}

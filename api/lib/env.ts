import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function requiredSecret(name: string): string {
  const value = required(name);
  if (
    process.env.NODE_ENV === "production" &&
    (value.length < 32 || value.startsWith("change_me") || value === "dev-secret")
  ) {
    throw new Error(`${name} must be a strong production secret of at least 32 characters`);
  }
  return value;
}

export const env = {
  appId: required("APP_ID"),
  appSecret: requiredSecret("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getD1(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Database unavailable.");
  return env.DB;
}

export async function getDb() {
  return drizzle(await getD1(), { schema });
}

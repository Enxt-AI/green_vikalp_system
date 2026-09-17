import { PrismaClient } from "@prisma/client";
// PrismaClient is attached to the `global` object in development to prevent exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Enforce pool guardrails without touching secrets. Explicit URL params
 * always win — this only fills in missing ones.
 *
 * Measured (prod Supabase, ap-southeast-2): the :6543 transaction pooler
 * adds ~1.5s per query vs the direct :5432 connection, so app servers use
 * direct and cap the pool to stay under Supabase's direct-connection limit:
 * - direct (:5432): 10 connections — covers per-request bursts (lead detail
 *   fans out 9 parallel queries; leads page ~8) from one API instance.
 * - pooler (:6543): 15 multiplexed connections (pooler absorbs the fan-out).
 */
function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const isDirect = url.port === "5432" || url.port === "5433";
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", isDirect ? "10" : "15");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const datasourceUrl = buildDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

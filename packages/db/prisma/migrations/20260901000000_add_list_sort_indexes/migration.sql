-- Add sort indexes for paginated list endpoints (orderBy createdAt)
-- Idempotent: safe to apply on Render via `bun run db:migrate`.
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX IF NOT EXISTS "Property_createdAt_idx" ON "Property"("createdAt");

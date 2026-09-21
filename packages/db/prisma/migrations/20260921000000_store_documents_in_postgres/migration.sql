-- Store uploaded files in Postgres (bytea) instead of S3.
-- New uploads write data + null s3Key; legacy S3 rows keep s3Key and are
-- served via presigned URLs until migrated. Nullable s3Key keeps @unique
-- valid (Postgres allows multiple NULLs). Apply on Render via `bun run db:migrate`.
ALTER TABLE "ManagedDocument" ADD COLUMN IF NOT EXISTS "data" BYTEA;
ALTER TABLE "ManagedDocument" ALTER COLUMN "s3Key" DROP NOT NULL;

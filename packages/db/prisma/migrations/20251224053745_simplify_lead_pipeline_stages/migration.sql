/*
  Warnings:

  - The values [QUALIFIED,DISQUALIFIED,CONVERTED] on the enum `LeadPipelineStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadPipelineStage_new" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION');
ALTER TABLE "public"."Lead" ALTER COLUMN "pipelineStage" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "pipelineStage" TYPE "LeadPipelineStage_new" USING ("pipelineStage"::text::"LeadPipelineStage_new");
ALTER TYPE "LeadPipelineStage" RENAME TO "LeadPipelineStage_old";
ALTER TYPE "LeadPipelineStage_new" RENAME TO "LeadPipelineStage";
DROP TYPE "public"."LeadPipelineStage_old";
ALTER TABLE "Lead" ALTER COLUMN "pipelineStage" SET DEFAULT 'NEW';
COMMIT;

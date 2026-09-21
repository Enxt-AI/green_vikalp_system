/**
 * One-off backfill: pull legacy S3-backed ManagedDocuments into Postgres (bytea).
 *
 * For each row with a non-null s3Key and null data it downloads the object
 * from S3, writes the bytes to the `data` column and clears `s3Key`.
 * Afterwards the file is served via GET /documents/:id/file.
 *
 * Usage (from apps/api, with AWS + DATABASE_URL env loaded):
 *   DRY_RUN=true bun backfill-documents.ts [limit]   # preview, no writes
 *   bun backfill-documents.ts [limit]                # migrate (+ delete S3 originals)
 *   DELETE_S3=false bun backfill-documents.ts        # migrate, keep S3 objects
 */
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@db/client";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "crm-documents";

const DRY_RUN = process.env.DRY_RUN === "true";
const DELETE_S3 = process.env.DELETE_S3 !== "false";
const LIMIT = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;

async function main() {
  const pending = await prisma.managedDocument.findMany({
    where: { s3Key: { not: null }, data: null },
    select: { id: true, name: true, s3Key: true, fileSize: true },
    orderBy: { createdAt: "asc" },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(
    `Found ${pending.length} S3-backed document(s)${DRY_RUN ? " (DRY RUN — no writes)" : ""}.`
  );

  let migrated = 0;
  let failed = 0;

  for (const doc of pending) {
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key! })
      );
      if (!res.Body) throw new Error("Empty S3 response body");
      const bytes = await res.Body.transformToByteArray();

      if (DRY_RUN) {
        console.log(`[dry-run] would migrate ${doc.id} (${doc.name}, ${bytes.length} bytes)`);
        migrated++;
        continue;
      }

      await prisma.managedDocument.update({
        where: { id: doc.id },
        data: { data: Buffer.from(bytes), s3Key: null },
      });

      if (DELETE_S3) {
        try {
          await s3.send(
            new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: doc.s3Key! })
          );
        } catch (s3Err) {
          console.error(`  DB updated but S3 delete failed for ${doc.s3Key}:`, s3Err);
        }
      }

      migrated++;
      console.log(`migrated ${doc.id} (${doc.name}, ${bytes.length} bytes)`);
    } catch (err) {
      failed++;
      console.error(`FAILED ${doc.id} (${doc.name}, key=${doc.s3Key}):`, err);
    }
  }

  console.log(`Done. migrated=${migrated} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());

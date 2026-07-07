import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "crm-documents";
const MAX_FILE_SIZE = 10485760; // 10MB in bytes
const ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * Generate a unique S3 key for uploaded file
 * @param originalFilename - Original filename
 * @param prefix - Optional prefix like 'clients/clientId' or 'documents'
 */
export function generateS3Key(originalFilename: string, prefix?: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString("hex");
  const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const basePath = prefix || "documents";
  return `${basePath}/${timestamp}-${randomString}-${sanitizedFilename}`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit. Uploaded: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: txt, pdf, png, jpg, jpeg. Got: ${file.mimetype}`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  file: Express.Multer.File,
  key: string
): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    console.log("Preparing S3 upload to bucket:", BUCKET_NAME, "key:", key);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Metadata for tracking
      Metadata: {
        originalFilename: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);
    console.log("S3 upload command sent successfully");

    return { success: true, key };
  } catch (error: any) {
    console.error("S3 upload error:", error);
    console.error("S3 error stack:", error.stack);
    console.error("S3 error code:", error.code);
    console.error("S3 error details:", JSON.stringify(error, null, 2));
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Generate presigned URL for viewing file (expires in 1 hour)
 */
export async function getPresignedViewUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate view URL");
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    console.error("S3 delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
}

/**
 * Check if file exists in S3
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error("Error fetching file metadata:", error);
    throw new Error("Failed to fetch file metadata");
  }
}

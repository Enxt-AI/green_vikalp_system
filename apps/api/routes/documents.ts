import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "@db/client";
import { uploadDocumentSchema, updateDocumentSchema } from "@repo/zod";
import { authenticate } from "../middleware/auth";
import multer from "multer";
import {
  validateFile,
  getPresignedViewUrl,
  deleteFromS3,
} from "../lib/s3";

const isProd = process.env.NODE_ENV === "production";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10485760, // 10MB
  },
});

// Shared access check: owner + admins always pass; others need a SHARED
// document shared directly or via a shared folder.
async function canAccessDocument(
  document: { uploadedById: string; type: string; sharedWithUsers: { id: string }[]; folder: { id: string; type: string } | null },
  userId: string,
  role: string
): Promise<boolean> {
  if (role === "ADMIN" || document.uploadedById === userId) return true;
  if (document.type === "PERSONAL") return false;
  if (document.sharedWithUsers.some((u) => u.id === userId)) return true;
  if (document.folder && document.folder.type === "SHARED") {
    const shared = await prisma.folder.findFirst({
      where: {
        id: document.folder.id,
        sharedWithUsers: { some: { id: userId } },
      },
    });
    if (shared) return true;
  }
  return false;
}

// GET /documents - List all documents (role-based)
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.user!;

    let documents;

    if (role === "ADMIN") {
      // Admin sees all documents
      documents = await prisma.managedDocument.findMany({
        omit: { data: true },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, username: true },
          },
          sharedWithUsers: {
            select: { id: true, fullName: true, username: true },
          },
          folder: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Manager/Employee see SHARED documents they have access to:
      // 1. Documents directly shared with them, OR
      // 2. Documents in folders shared with them
      // NOTE: a previous revision fetched ALL shared documents here first and
      // discarded the result — removed, it doubled DB cost on every load.
      documents = await prisma.managedDocument.findMany({
        omit: { data: true },
        where: {
          OR: [
            {
              // User's own documents (both PERSONAL and SHARED)
              uploadedById: userId,
            },
            {
              // Documents directly shared with user
              type: "SHARED",
              sharedWithUsers: {
                some: { id: userId },
              },
            },
            {
              // Documents in folders shared with user
              type: "SHARED",
              folder: {
                type: "SHARED",
                sharedWithUsers: {
                  some: { id: userId },
                },
              },
            },
          ],
        },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true },
          },
          sharedWithUsers: {
            select: { id: true, fullName: true },
          },
          folder: {
            select: { id: true, name: true, type: true, sharedWithUsers: {
              select: { id: true, fullName: true },
            }},
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// GET /documents/:id - Get single document details
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const document = await prisma.managedDocument.findUnique({
      where: { id },
      omit: { data: true },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, username: true },
        },
        sharedWithUsers: {
          select: { id: true, fullName: true, username: true },
        },
        folder: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Check access permissions
    if (role !== "ADMIN" && document.uploadedById !== userId) {
      // Only SHARED documents accessible to non-admins if they didn't upload it
      if (document.type === "PERSONAL") {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      // Check if user has access via:
      // 1. Direct document sharing, OR
      // 2. Folder sharing
      const hasDirectAccess = document.sharedWithUsers.some((u: any) => u.id === userId);
      const hasFolderAccess = document.folder && 
        document.folder.type === "SHARED" &&
        await prisma.folder.findFirst({
          where: {
            id: document.folder.id,
            sharedWithUsers: {
              some: { id: userId },
            },
          },
        });
      
      if (!hasDirectAccess && !hasFolderAccess) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// GET /documents/:id/file - Stream file bytes (Postgres) or redirect to
// legacy S3 presigned URL. Same permission checks as /view. Clients open the
// durable `/documents/:id/file` path returned by /view for DB-stored files.
router.get("/:id/file", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const document = await prisma.managedDocument.findUnique({
      where: { id },
      include: {
        sharedWithUsers: {
          select: { id: true },
        },
        folder: {
          select: { id: true, type: true },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!(await canAccessDocument(document, userId, role))) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (document.data) {
      const bytes = Buffer.from(document.data);
      res.setHeader("Content-Type", document.fileType || "application/octet-stream");
      res.setHeader("Content-Length", String(bytes.length));
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${document.name.replace(/"/g, "")}"`
      );
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(bytes);
      return;
    }

    if (document.s3Key) {
      const url = await getPresignedViewUrl(document.s3Key, 3600);
      res.redirect(url);
      return;
    }

    res.status(404).json({ error: "File content not found" });
  } catch (error) {
    console.error("Error serving document file:", error);
    res.status(500).json({ error: "Failed to serve document" });
  }
});

// GET /documents/:id/view - Get view URL for a document.
// DB-stored files return a durable app-hosted path (no expiry);
// legacy S3 files return a presigned URL (expires in 1 hour).
router.get("/:id/view", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const document = await prisma.managedDocument.findUnique({
      where: { id },
      omit: { data: true },
      include: {
        sharedWithUsers: {
          select: { id: true },
        },
        folder: {
          select: { id: true, type: true },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (!(await canAccessDocument(document, userId, role))) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Files stored in Postgres get a durable app-hosted URL (served by
    // GET /documents/:id/file, no expiry). Legacy S3 files fall back to a
    // presigned URL (expires in 1 hour).
    if (!document.s3Key) {
      res.json({
        url: `/documents/${document.id}/file`,
        fileName: document.name,
        fileType: document.fileType,
        expiresIn: null,
        storage: "database",
      });
      return;
    }

    // Generate presigned URL (expires in 1 hour)
    const viewUrl = await getPresignedViewUrl(document.s3Key, 3600);

    res.json({
      url: viewUrl,
      fileName: document.name,
      fileType: document.fileType,
      expiresIn: 3600,
      storage: "s3",
    });
  } catch (error) {
    console.error("Error generating view URL:", error);
    res.status(500).json({ error: "Failed to generate view URL" });
  }
});

// POST /documents/upload - Upload new document
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const { role, userId } = req.user!;

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      if (!isProd) console.log("Uploading file:", req.file.originalname, req.file.size, "bytes");

      // Validate file
      const validation = validateFile(req.file);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Parse metadata from request body
      const metadata = {
        name: req.body.name || req.file.originalname,
        type: req.body.type || "SHARED",
        folderId: req.body.folderId || null,
        sharedWithUserIds: req.body.sharedWithUserIds
          ? JSON.parse(req.body.sharedWithUserIds)
          : [],
      };

      const metadataValidation = uploadDocumentSchema.safeParse(metadata);
      if (!metadataValidation.success) {
        res.status(400).json({ error: metadataValidation.error.errors });
        return;
      }

      const { name, type, folderId, sharedWithUserIds } = metadataValidation.data;

      // Verify folder exists if provided
      if (folderId) {
        const folder = await prisma.folder.findUnique({ 
          where: { id: folderId },
          include: {
            sharedWithUsers: {
              select: { id: true, fullName: true },
            },
          },
        });
        if (!folder) {
          res.status(404).json({ error: "Folder not found" });
          return;
        }
      }

      if (!isProd) console.log("Storing file in Postgres:", req.file.originalname, req.file.size, "bytes");

      // Save file bytes directly in Postgres (bytea) instead of S3.
      // s3Key stays null; file content is served via GET /documents/:id/file.
      const document = await prisma.managedDocument.create({
        data: {
          name,
          s3Key: null,
          data: req.file.buffer,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          type,
          folderId: folderId || null,
          uploadedById: userId,
          sharedWithUsers: sharedWithUserIds?.length
            ? {
                connect: sharedWithUserIds.map((id: string) => ({ id })),
              }
            : undefined,
        },
        omit: { data: true },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, username: true },
          },
          sharedWithUsers: {
            select: { id: true, fullName: true, username: true },
          },
          folder: {
            select: { id: true, name: true, type: true },
          },
        },
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  }
);

// PATCH /documents/:id - Update document metadata (Admin only)
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.user!;

    if (role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can update documents" });
      return;
    }

    const validation = updateDocumentSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { name, sharedWithUserIds } = validation.data;

    // Check if document exists
    const existingDoc = await prisma.managedDocument.findUnique({ where: { id } });
    if (!existingDoc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Update document
    const document = await prisma.managedDocument.update({
      where: { id },
      data: {
        name: name || undefined,
        sharedWithUsers: sharedWithUserIds
          ? {
              set: sharedWithUserIds.map((userId: string) => ({ id: userId })),
            }
          : undefined,
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, username: true },
        },
        sharedWithUsers: {
          select: { id: true, fullName: true, username: true },
        },
        folder: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    res.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// DELETE /documents/:id - Delete document (Admin only)
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.user!;

    if (role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can delete documents" });
      return;
    }

    // Get document details (bytes excluded)
    const document = await prisma.managedDocument.findUnique({
      where: { id },
      select: { id: true, name: true, s3Key: true },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Legacy S3 files: remove the object too. DB-stored files die with the row.
    if (document.s3Key) {
      const s3DeleteResult = await deleteFromS3(document.s3Key);
      if (!s3DeleteResult.success) {
        console.error("S3 deletion failed:", s3DeleteResult.error);
        // Continue with database deletion even if S3 fails
      }
    }

    // Delete from database
    await prisma.managedDocument.delete({ where: { id } });

    res.json({
      message: "Document deleted successfully",
      fileName: document.name,
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;

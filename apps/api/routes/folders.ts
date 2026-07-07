import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "@db/client";
import {
  createFolderSchema,
  updateFolderSchema,
} from "@repo/zod";
import { authenticate } from "../middleware/auth";

const router = Router();

// Helper: Check folder depth (max 3 levels)
async function getFolderDepth(folderId: string | null): Promise<number> {
  if (!folderId) return 0;

  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId && depth < 5) {
    // Safety limit
    const folder: any = await prisma.folder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!folder) break;
    depth++;
    currentId = folder.parentId;
  }

  return depth;
}

// GET /folders - List all folders (role-based)
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.user!;

    let folders;

    if (role === "ADMIN") {
      // Admin sees all folders with full details
      folders = await prisma.folder.findMany({
        include: {
          createdBy: {
            select: { id: true, fullName: true, username: true },
          },
          sharedWithUsers: {
            select: { id: true, fullName: true, username: true },
          },
          managedDocuments: {
            select: { id: true, name: true, fileSize: true, fileType: true },
          },
          parent: {
            select: { id: true, name: true },
          },
          children: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
    } else {
      // Manager/Employee see only SHARED folders they have access to
      folders = await prisma.folder.findMany({
        where: {
          type: "SHARED",
          sharedWithUsers: {
            some: { id: userId },
          },
        },
        include: {
          createdBy: {
            select: { id: true, fullName: true },
          },
          sharedWithUsers: {
            select: { id: true, fullName: true },
          },
          managedDocuments: {
            select: { id: true, name: true, fileSize: true, fileType: true },
          },
          parent: {
            select: { id: true, name: true },
          },
          children: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    res.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

// GET /folders/:id - Get single folder details
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
        sharedWithUsers: {
          select: { id: true, fullName: true, username: true },
        },
        managedDocuments: {
          select: {
            id: true,
            name: true,
            fileSize: true,
            fileType: true,
            type: true,
            createdAt: true,
          },
        },
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    // Check access permissions
    if (role !== "ADMIN") {
      // Only SHARED folders accessible to non-admins
      if (folder.type === "PERSONAL") {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      // Check if user has access
      const hasAccess = folder.sharedWithUsers.some((u: any) => u.id === userId);
      if (!hasAccess) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    res.json(folder);
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).json({ error: "Failed to fetch folder" });
  }
});

// POST /folders - Create new folder (Admin only)
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;

    if (role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can create folders" });
      return;
    }

    const validation = createFolderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { name, type, parentId, sharedWithUserIds } = validation.data;

    // Check folder depth limit (max 3 levels)
    if (parentId) {
      const depth = await getFolderDepth(parentId);
      if (depth >= 3) {
        res.status(400).json({
          error: "Maximum folder nesting depth (3 levels) exceeded",
        });
        return;
      }

      // Verify parent folder exists
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId },
      });

      if (!parentFolder) {
        res.status(404).json({ error: "Parent folder not found" });
        return;
      }
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        name,
        type,
        parentId: parentId || null,
        createdById: userId,
        sharedWithUsers: sharedWithUserIds?.length
          ? {
              connect: sharedWithUserIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
        sharedWithUsers: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    console.log(`Folder "${folder.name}" created with ${folder.sharedWithUsers.length} shared users:`,
      folder.sharedWithUsers.map(u => u.fullName));

    res.status(201).json(folder);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// PATCH /folders/:id - Update folder (rename or change sharing) (Admin only)
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.user!;

    if (role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can update folders" });
      return;
    }

    const validation = updateFolderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: validation.error.errors });
      return;
    }

    const { name, sharedWithUserIds } = validation.data;

    // Check if folder exists
    const existingFolder = await prisma.folder.findUnique({ where: { id } });
    if (!existingFolder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    // Update folder
    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name: name || undefined,
        sharedWithUsers: sharedWithUserIds
          ? {
              set: sharedWithUserIds.map((userId) => ({ id: userId })),
            }
          : undefined,
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
        sharedWithUsers: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    res.json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ error: "Failed to update folder" });
  }
});

// DELETE /folders/:id - Delete folder (Admin only) - Cascade deletes documents
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.user!;

    if (role !== "ADMIN") {
      res.status(403).json({ error: "Only admins can delete folders" });
      return;
    }

    // Check if folder exists
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        children: true,
        managedDocuments: true,
      },
    });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    // Check if folder has children
    if (folder.children.length > 0) {
      res.status(400).json({
        error: "Cannot delete folder with subfolders. Delete children first.",
      });
      return;
    }

    // Delete folder (cascades to documents due to schema)
    await prisma.folder.delete({ where: { id } });

    res.json({
      message: "Folder deleted successfully",
      documentsDeleted: folder.managedDocuments.length,
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

export default router;


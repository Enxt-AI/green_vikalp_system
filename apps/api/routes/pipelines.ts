import { Router } from "express";
import prisma from "@db/client";
import { authenticate, requireRole } from "../middleware/auth";
import {
  createPipelineSchema,
  updatePipelineSchema,
  createPipelineStageSchema,
  updatePipelineStageSchema,
} from "@repo/zod";

const router = Router();

// Get all pipelines
router.get("/", authenticate, async (req, res) => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { isActive: true },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(pipelines);
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

// Get single pipeline with stages
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        campaigns: {
          include: {
            _count: {
              select: { leads: true },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" });
    }

    res.json(pipeline);
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

/**
 * POST /pipelines
 * Create a new sales pipeline with automatic final stages
 * 
 * Access: ADMIN and MANAGER roles only
 * 
 * Request Body:
 * - name: Pipeline name
 * - description: Pipeline description
 * - type: Pipeline type (BUYER, SELLER, etc.)
 * - stages: Array of user-defined stages (active pipeline stages)
 * 
 * Automatic Stage Creation:
 * This endpoint AUTOMATICALLY appends two mandatory final stages:
 * 1. "Closed Won" (green, isFinal: true) - Successful deals
 * 2. "Closed Lost" (red, isFinal: true) - Lost opportunities
 * 
 * Stage Ordering:
 * - User stages get order: 0, 1, 2, ... n
 * - Closed Won gets order: n + 1
 * - Closed Lost gets order: n + 2
 * 
 * Why Final Stages are Mandatory:
 * - Ensures consistent deal outcome tracking across all pipelines
 * - Enables accurate win rate and conversion metrics
 * - Provides standardized reporting
 * 
 * Example:
 * User creates stages: ["New Lead", "Qualified", "Proposal"]
 * System creates: ["New Lead", "Qualified", "Proposal", "Closed Won", "Closed Lost"]
 * 
 * Response: Complete pipeline object with all stages (user + final stages)
 */
router.post("/", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const validatedData = createPipelineSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Prepare stages with user-defined stages + mandatory final stages
    const userStages = validatedData.stages.map((stage, index) => ({
      name: stage.name,
      description: stage.description,
      order: index,
      color: stage.color || "#3B82F6",
      isDefault: stage.isDefault || index === 0,
      isFinal: false,
    }));

    // Add mandatory Closed Won and Closed Lost stages at the end
    const finalStages = [
      {
        name: "Closed Won",
        description: "Successfully closed deals",
        order: userStages.length,
        color: "#16a34a", // Green
        isDefault: false,
        isFinal: true,
      },
      {
        name: "Closed Lost",
        description: "Deals that did not close",
        order: userStages.length + 1,
        color: "#dc2626", // Red
        isDefault: false,
        isFinal: true,
      },
    ];

    // Create pipeline with all stages
    const pipeline = await prisma.pipeline.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        createdById: userId,
        stages: {
          create: [...userStages, ...finalStages],
        },
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    res.status(201).json(pipeline);
  } catch (error: any) {
    console.error("Error creating pipeline:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create pipeline" });
  }
});

// Update pipeline
router.put("/:id", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePipelineSchema.parse(req.body);

    const pipeline = await prisma.pipeline.update({
      where: { id },
      data: validatedData,
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    res.json(pipeline);
  } catch (error: any) {
    console.error("Error updating pipeline:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pipeline not found" });
    }
    res.status(500).json({ error: "Failed to update pipeline" });
  }
});

// Delete pipeline (soft delete)
router.delete("/:id", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.pipeline.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: "Pipeline deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting pipeline:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pipeline not found" });
    }
    res.status(500).json({ error: "Failed to delete pipeline" });
  }
});

// Add stage to pipeline
router.post("/:id/stages", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createPipelineStageSchema.parse(req.body);

    // Check if pipeline exists
    const pipeline = await prisma.pipeline.findUnique({ where: { id } });
    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" });
    }

    // Get existing stages to determine order if not provided
    const existingStages = await prisma.pipelineStage.findMany({
      where: { pipelineId: id },
      orderBy: { order: "desc" },
      take: 1,
    });

    const nextOrder = existingStages.length > 0 ? (existingStages[0]?.order ?? 0) + 1 : 0;

    // Shift existing stages if inserting in between
    if (validatedData.order !== undefined && validatedData.order <= nextOrder) {
      await prisma.pipelineStage.updateMany({
        where: {
          pipelineId: id,
          order: { gte: validatedData.order },
        },
        data: {
          order: { increment: 1 },
        },
      });
    }

    const stage = await prisma.pipelineStage.create({
      data: {
        pipeline: { connect: { id } },
        name: validatedData.name,
        description: validatedData.description,
        order: validatedData.order ?? nextOrder,
        color: validatedData.color || "#3B82F6",
        isDefault: validatedData.isDefault || false,
      },
    });

    res.status(201).json(stage);
  } catch (error: any) {
    console.error("Error adding stage:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to add stage" });
  }
});

// Update stage
router.patch("/:id/stages/:stageId", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const validatedData = updatePipelineStageSchema.parse(req.body);

    // Verify stage belongs to pipeline
    const existingStage = await prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId: id },
    });

    if (!existingStage) {
      return res.status(404).json({ error: "Stage not found in this pipeline" });
    }

    // Handle order change
    if (validatedData.order !== undefined && validatedData.order !== existingStage.order) {
      const oldOrder = existingStage.order;
      const newOrder = validatedData.order;

      if (newOrder < oldOrder) {
        // Moving up: shift stages down
        await prisma.pipelineStage.updateMany({
          where: {
            pipelineId: id,
            order: { gte: newOrder, lt: oldOrder },
          },
          data: { order: { increment: 1 } },
        });
      } else {
        // Moving down: shift stages up
        await prisma.pipelineStage.updateMany({
          where: {
            pipelineId: id,
            order: { gt: oldOrder, lte: newOrder },
          },
          data: { order: { decrement: 1 } },
        });
      }
    }

    const stage = await prisma.pipelineStage.update({
      where: { id: stageId },
      data: validatedData,
    });

    res.json(stage);
  } catch (error: any) {
    console.error("Error updating stage:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Stage not found" });
    }
    res.status(500).json({ error: "Failed to update stage" });
  }
});

// Delete stage
router.delete("/:id/stages/:stageId", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { id, stageId } = req.params;

    // Check if stage has leads
    const leadsCount = await prisma.lead.count({
      where: { currentStageId: stageId },
    });

    if (leadsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete stage with active leads",
        leadsCount,
      });
    }

    // Get stage order before deletion
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId: id },
    });

    if (!stage) {
      return res.status(404).json({ error: "Stage not found" });
    }

    // Delete stage
    await prisma.pipelineStage.delete({
      where: { id: stageId },
    });

    // Shift remaining stages up
    await prisma.pipelineStage.updateMany({
      where: {
        pipelineId: id,
        order: { gt: stage.order },
      },
      data: { order: { decrement: 1 } },
    });

    res.json({ message: "Stage deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting stage:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Stage not found" });
    }
    res.status(500).json({ error: "Failed to delete stage" });
  }
});

export default router;

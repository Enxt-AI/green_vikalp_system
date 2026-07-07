import { Router } from "express";
import prisma from "@db/client";
import { authenticate } from "../middleware/auth";
import { createInteractionSchema } from "@repo/zod";
import { processInteractionEvent } from "../lib/workflow-engine";

const router = Router();

// Get all interactions (filtered by lead if provided)
router.get("/", authenticate, async (req, res) => {
  try {
    const { leadId, type, startDate, endDate } = req.query;

    const where: any = {};

    if (leadId) {
      where.leadId = leadId as string;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate as string);
      if (endDate) where.occurredAt.lte = new Date(endDate as string);
    }

    const interactions = await prisma.interaction.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { occurredAt: "desc" },
    });

    res.json(interactions);
  } catch (error) {
    console.error("Error fetching interactions:", error);
    res.status(500).json({ error: "Failed to fetch interactions" });
  }
});

// Get interaction statistics
router.get("/stats", authenticate, async (req, res) => {
  try {
    const { leadId, startDate, endDate } = req.query;

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate as string);
      if (endDate) where.occurredAt.lte = new Date(endDate as string);
    }

    // Count by type
    const byType = await prisma.interaction.groupBy({
      by: ["type"],
      where,
      _count: true,
    });

    // Total duration of calls
    const callStats = await prisma.interaction.aggregate({
      where: { ...where, type: "CALL", duration: { not: null } },
      _sum: { duration: true },
      _avg: { duration: true },
      _count: true,
    });

    // Count by direction
    const byDirection = await prisma.interaction.groupBy({
      by: ["direction"],
      where,
      _count: true,
    });

    res.json({
      byType: byType.map((item: any) => ({
        type: item.type,
        count: item._count,
      })),
      byDirection: byDirection.map((item: any) => ({
        direction: item.direction,
        count: item._count,
      })),
      calls: {
        total: callStats._count,
        totalDuration: callStats._sum.duration || 0,
        averageDuration: callStats._avg.duration || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching interaction stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get single interaction
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interaction.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
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

    if (!interaction) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    res.json(interaction);
  } catch (error) {
    console.error("Error fetching interaction:", error);
    res.status(500).json({ error: "Failed to fetch interaction" });
  }
});

// Create interaction
router.post("/", authenticate, async (req, res) => {
  try {
    const validatedData = createInteractionSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: validatedData.leadId },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const interaction = await prisma.interaction.create({
      data: {
        leadId: validatedData.leadId,
        type: validatedData.type,
        subject: validatedData.subject,
        content: validatedData.content,
        direction: validatedData.direction,
        duration: validatedData.duration,
        recordingUrl: validatedData.recordingUrl,
        emailFrom: validatedData.emailFrom,
        emailTo: validatedData.emailTo,
        emailCc: validatedData.emailCc,
        phoneNumber: validatedData.phoneNumber,
        occurredAt: validatedData.occurredAt ? new Date(validatedData.occurredAt) : new Date(),
        createdById: userId,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Update lead's lastContactedAt
    await prisma.lead.update({
      where: { id: validatedData.leadId },
      data: { lastContactedAt: new Date() },
    });

    // Trigger workflow engine (fire and forget)
    await processInteractionEvent(interaction.id).catch(err => 
      console.error("Workflow engine error:", err)
    );

    res.status(201).json(interaction);
  } catch (error: any) {
    console.error("Error creating interaction:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create interaction" });
  }
});

// Create interaction for a specific lead (convenience endpoint)
router.post("/leads/:leadId", authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;
    const userId = (req as any).user.userId;

    // Merge leadId into body
    const dataWithLeadId = { ...req.body, leadId };
    const validatedData = createInteractionSchema.parse(dataWithLeadId);

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const interaction = await prisma.interaction.create({
      data: {
        leadId: validatedData.leadId,
        type: validatedData.type,
        subject: validatedData.subject,
        content: validatedData.content,
        direction: validatedData.direction,
        duration: validatedData.duration,
        recordingUrl: validatedData.recordingUrl,
        emailFrom: validatedData.emailFrom,
        emailTo: validatedData.emailTo,
        emailCc: validatedData.emailCc,
        phoneNumber: validatedData.phoneNumber,
        occurredAt: validatedData.occurredAt ? new Date(validatedData.occurredAt) : new Date(),
        createdById: userId,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Update lead's lastContactedAt
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactedAt: new Date() },
    });

    // Trigger workflow engine (fire and forget)
    await processInteractionEvent(interaction.id).catch(err => 
      console.error("Workflow engine error:", err)
    );

    res.status(201).json(interaction);
  } catch (error: any) {
    console.error("Error creating interaction:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create interaction" });
  }
});

// Delete interaction
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const interaction = await prisma.interaction.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!interaction) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    // Only creator or admin can delete
    if (interaction.createdById !== userId && userRole !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this interaction" });
    }

    await prisma.interaction.delete({
      where: { id },
    });

    res.json({ message: "Interaction deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting interaction:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Interaction not found" });
    }
    res.status(500).json({ error: "Failed to delete interaction" });
  }
});

export default router;

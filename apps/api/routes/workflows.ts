import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "@db/client";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /workflows
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sourceCampaign: true,
        destinationCampaign: true,
        stage: true,
      },
    });
    res.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// POST /workflows
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const {
      name,
      trigger,
      sourceCampaignId,
      stageId,
      tag,
      action,
      destinationCampaignId,
      destinationStageId,
      assignmentOption,
    } = req.body;

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: name || `Workflow - ${trigger}`,
        trigger,
        sourceCampaignId: sourceCampaignId || null,
        stageId: stageId || null,
        tag: tag || null,
        action,
        destinationCampaignId: destinationCampaignId || null,
        destinationStageId: destinationStageId || null,
        assignmentOption: assignmentOption || null,
        createdById: user.userId,
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    console.error("Error creating workflow:", error);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

// PATCH /workflows/:id
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate ownership or admin status if needed, but for now just update
    const workflow = await prisma.workflow.update({
      where: { id },
      data: updateData
    });
    
    res.json(workflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

// DELETE /workflows/:id
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.workflow.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting workflow:", error);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

export default router;

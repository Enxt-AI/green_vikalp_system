import { Router } from "express";
import prisma from "@db/client";
import { authenticate, requireRole } from "../middleware/auth";
import { createCampaignSchema, updateCampaignSchema } from "@repo/zod";

const router = Router();

/**
 * Helper function to check if a user has access to a specific campaign
 * 
 * Access Rules:
 * - ADMIN and MANAGER roles: Full access to all campaigns
 * - EMPLOYEE role: Only access to campaigns they are assigned to
 * 
 * @param campaignId - UUID of the campaign to check access for
 * @param userId - UUID of the user requesting access
 * @param userRole - Role of the user (ADMIN, MANAGER, or EMPLOYEE)
 * @returns Promise<boolean> - true if user has access, false otherwise
 * 
 * @example
 * const hasAccess = await checkCampaignAccess(campaignId, userId, "EMPLOYEE");
 * if (!hasAccess) return res.status(403).json({ error: "Access denied" });
 */
const checkCampaignAccess = async (campaignId: string, userId: string, userRole: string) => {
  if (userRole === "ADMIN" || userRole === "MANAGER") {
    return true;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { assignedToIds: true },
  });

  return campaign && campaign.assignedToIds.includes(userId);
};

/**
 * GET /campaigns
 * Retrieve all campaigns with role-based access control
 * 
 * Query Parameters:
 * - status (optional): Filter by campaign status (ACTIVE, PAUSED, COMPLETED, DRAFT, ARCHIVED)
 * - pipelineId (optional): Filter by pipeline ID
 * 
 * Access Control:
 * - ADMIN/MANAGER: Can see all campaigns
 * - EMPLOYEE: Only sees campaigns they are assigned to
 * 
 * Response: Array of campaign objects with pipeline, creator, and assigned users details
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { status, pipelineId } = req.query;

    const where: any = {};

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Filter by pipeline if provided
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    // Employee access control: only see assigned campaigns
    if (userRole === "EMPLOYEE") {
      where.assignedToIds = { has: userId };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        pipeline: {
          select: {
            id: true,
            name: true,
            type: true,
            stages: {
              select: {
                id: true,
                name: true,
                order: true,
                color: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// Get campaign statistics
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const where: any = {};
    if (userRole === "EMPLOYEE") {
      where.assignedToIds = { has: userId };
    }

    const [total, active, completed, totalLeads] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.campaign.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.lead.count({
        where: {
          campaign: userRole === "EMPLOYEE" ? { assignedToIds: { has: userId } } : undefined,
        },
      }),
    ]);

    res.json({
      total,
      active,
      completed,
      totalLeads,
    });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get single campaign
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        pipeline: {
          include: {
            stages: {
              orderBy: { order: "asc" },
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
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        campaignProperties: {
          include: {
            property: {
              include: {
                listedBy: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: [{ order: "asc" }, { addedAt: "desc" }],
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

/**
 * GET /campaigns/:id/leads
 * Retrieve all leads for a specific campaign (including archived leads)
 * 
 * Path Parameters:
 * - id: Campaign UUID
 * 
 * Query Parameters:
 * - stageId (optional): Filter leads by pipeline stage
 * - assignedToId (optional): Filter leads by assigned user
 * 
 * Important Notes:
 * - Returns ALL leads including archived ones for accurate metrics calculation
 * - Frontend is responsible for filtering archived leads in Kanban/active views
 * - Archived leads from Closed Won/Lost stages are counted in metrics
 * 
 * Access Control: Checked via checkCampaignAccess()
 * 
 * Response: Array of lead objects with stage, assignedTo, and interaction counts
 */
router.get("/:id/leads", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { stageId, assignedToId } = req.query;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    // Remove isArchived filter to get ALL leads (archived and non-archived)
    // Frontend will handle filtering based on view mode
    const where: any = { campaignId: id };

    if (stageId) {
      where.currentStageId = stageId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        currentStage: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            interactions: true,
            tasks: true,
            meetings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(leads);
  } catch (error) {
    console.error("Error fetching campaign leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Get campaign analytics/stats
router.get("/:id/stats", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        budget: true,
        actualSpend: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get lead counts by stage
    const leadsByStage = await prisma.lead.groupBy({
      by: ["currentStageId"],
      where: { campaignId: id, isArchived: false },
      _count: true,
    });

    // Get stage details
    const stageIds = leadsByStage.map((s) => s.currentStageId);
    const stages = await prisma.pipelineStage.findMany({
      where: { id: { in: stageIds } },
      select: { id: true, name: true, color: true, order: true },
    });

    const stageStats = leadsByStage.map((stat) => {
      const stage = stages.find((s) => s.id === stat.currentStageId);
      return {
        stageId: stat.currentStageId,
        stageName: stage?.name || "Unknown",
        stageColor: stage?.color || "#666",
        stageOrder: stage?.order || 0,
        count: stat._count,
      };
    }).sort((a, b) => a.stageOrder - b.stageOrder);

    // Get total leads
    const totalLeads = await prisma.lead.count({
      where: { campaignId: id, isArchived: false },
    });

    // Calculate cost per lead
    const costPerLead = campaign.budget && totalLeads > 0
      ? Number(campaign.budget) / totalLeads
      : null;

    // Get leads created over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leadsOverTime = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "Lead"
      WHERE campaign_id = ${id}
        AND created_at >= ${thirtyDaysAgo}
        AND is_archived = false
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const timeline = leadsOverTime.map((item) => ({
      date: item.date,
      count: Number(item.count),
    }));

    res.json({
      totalLeads,
      budget: campaign.budget ? Number(campaign.budget) : null,
      actualSpend: campaign.actualSpend ? Number(campaign.actualSpend) : null,
      costPerLead,
      stageDistribution: stageStats,
      timeline,
    });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    res.status(500).json({ error: "Failed to fetch campaign statistics" });
  }
});

// Create campaign (admin/manager only)
router.post("/", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const validatedData = createCampaignSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify pipeline exists
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: validatedData.pipelineId },
    });

    if (!pipeline) {
      return res.status(404).json({ error: "Pipeline not found" });
    }

    // Verify assigned users exist
    if (validatedData.assignedToIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: validatedData.assignedToIds } },
      });

      if (users.length !== validatedData.assignedToIds.length) {
        return res.status(400).json({ error: "One or more assigned users not found" });
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        pipelineId: validatedData.pipelineId,
        status: validatedData.status,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        budget: validatedData.budget,
        source: validatedData.source,
        sourceDetails: validatedData.sourceDetails,
        assignedToIds: validatedData.assignedToIds,
        createdById: userId,
      },
      include: {
        pipeline: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// Update campaign
router.put("/:id", authenticate, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateCampaignSchema.parse(req.body);

    // Verify assigned users if provided
    if (validatedData.assignedToIds && validatedData.assignedToIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: validatedData.assignedToIds } },
      });

      if (users.length !== validatedData.assignedToIds.length) {
        return res.status(400).json({ error: "One or more assigned users not found" });
      }
    }

    const updateData: any = { ...validatedData };
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        pipeline: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.json(campaign);
  } catch (error: any) {
    console.error("Error updating campaign:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// Delete campaign (admin only)
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated leads (which cascades to interactions, documents, etc.)
      await tx.lead.deleteMany({
        where: { campaignId: id },
      });

      // 2. Delete workflows linked to this campaign
      await tx.workflow.deleteMany({
        where: {
          OR: [
            { sourceCampaignId: id },
            { destinationCampaignId: id }
          ]
        },
      });

      // 3. Finally delete the campaign
      await tx.campaign.delete({
        where: { id },
      });
    });

    res.json({ message: "Campaign and all associated data deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting campaign:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// ================================
// CAMPAIGN PROPERTY ENDPOINTS
// ================================

// Get all properties for a campaign
router.get("/:id/properties", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    const campaignProperties = await prisma.campaignProperty.findMany({
      where: { campaignId: id },
      include: {
        property: {
          include: {
            listedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
            _count: {
              select: {
                interests: true,
              },
            },
          },
        },
      },
      orderBy: [{ order: "asc" }, { addedAt: "desc" }],
    });

    res.json(campaignProperties);
  } catch (error) {
    console.error("Error fetching campaign properties:", error);
    res.status(500).json({ error: "Failed to fetch campaign properties" });
  }
});

// Add property to campaign
router.post("/:id/properties", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyId, isFeatured, order, notes } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check campaign access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Verify property exists
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Check if already added
    const existing = await prisma.campaignProperty.findUnique({
      where: {
        campaignId_propertyId: {
          campaignId: id as string,
          propertyId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Property already added to this campaign" });
    }

    // Get the next order number if not provided
    const nextOrder = order ?? (await prisma.campaignProperty.count({ where: { campaignId: id } }));

    const campaignProperty = await prisma.campaignProperty.create({
      data: {
        campaignId: id as string,
        propertyId,
        isFeatured: isFeatured ?? false,
        order: nextOrder,
        notes,
      },
      include: {
        property: {
          include: {
            listedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(campaignProperty);
  } catch (error: any) {
    console.error("Error adding property to campaign:", error);
    res.status(500).json({ error: "Failed to add property to campaign" });
  }
});

// Update campaign property (toggle featured, reorder, update notes)
router.put("/:id/properties/:propertyId", authenticate, async (req, res) => {
  try {
    const { id, propertyId } = req.params;
    const { isFeatured, order, notes } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    // Find the campaign property
    const campaignProperty = await prisma.campaignProperty.findUnique({
      where: {
        campaignId_propertyId: {
          campaignId: id as string,
          propertyId: propertyId as string,
        },
      },
    });

    if (!campaignProperty) {
      return res.status(404).json({ error: "Property not found in this campaign" });
    }

    // Update
    const updateData: any = {};
    if (typeof isFeatured === "boolean") updateData.isFeatured = isFeatured;
    if (typeof order === "number") updateData.order = order;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.campaignProperty.update({
      where: {
        campaignId_propertyId: {
          campaignId: id as string,
          propertyId: propertyId as string,
        },
      },
      data: updateData,
      include: {
        property: {
          include: {
            listedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating campaign property:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Property not found in this campaign" });
    }
    res.status(500).json({ error: "Failed to update campaign property" });
  }
});

// Remove property from campaign
router.delete("/:id/properties/:propertyId", authenticate, async (req, res) => {
  try {
    const { id, propertyId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    await prisma.campaignProperty.delete({
      where: {
        campaignId_propertyId: {
          campaignId: id as string,
          propertyId: propertyId as string,
        },
      },
    });

    res.json({ message: "Property removed from campaign successfully" });
  } catch (error: any) {
    console.error("Error removing property from campaign:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Property not found in this campaign" });
    }
    res.status(500).json({ error: "Failed to remove property from campaign" });
  }
});

// Bulk add properties to campaign
router.post("/:id/properties/bulk", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyIds } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: "propertyIds must be a non-empty array" });
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get current max order
    const maxOrder = await prisma.campaignProperty.count({ where: { campaignId: id } });

    // Get existing property IDs in this campaign
    const existing = await prisma.campaignProperty.findMany({
      where: { campaignId: id, propertyId: { in: propertyIds } },
      select: { propertyId: true },
    });
    const existingIds = new Set(existing.map(e => e.propertyId));

    // Filter out already added properties
    const newPropertyIds = propertyIds.filter(pid => !existingIds.has(pid));

    if (newPropertyIds.length === 0) {
      return res.status(400).json({ error: "All properties already added to this campaign" });
    }

    // Verify all new properties exist
    const properties = await prisma.property.findMany({
      where: { id: { in: newPropertyIds } },
      select: { id: true },
    });

    if (properties.length !== newPropertyIds.length) {
      return res.status(404).json({ error: "One or more properties not found" });
    }

    // Create campaign properties
    const campaignProperties = await prisma.$transaction(
      newPropertyIds.map((propertyId, index) =>
        prisma.campaignProperty.create({
          data: {
            campaignId: id as string,
            propertyId,
            order: maxOrder + index,
          },
        })
      )
    );

    res.status(201).json({
      message: `Added ${campaignProperties.length} properties to campaign`,
      added: campaignProperties.length,
      skipped: existingIds.size,
    });
  } catch (error: any) {
    console.error("Error bulk adding properties to campaign:", error);
    res.status(500).json({ error: "Failed to add properties to campaign" });
  }
});

/**
 * PUT /campaigns/:id/leads/:leadId/stage
 * Move a lead to a different pipeline stage (Kanban drag-and-drop handler)
 * 
 * Path Parameters:
 * - id: Campaign UUID
 * - leadId: Lead UUID
 * 
 * Request Body:
 * - stageId: Target pipeline stage UUID
 * 
 * Workflow:
 * 1. Validates campaign access and ownership
 * 2. Verifies lead belongs to the campaign
 * 3. Verifies target stage exists and belongs to campaign's pipeline
 * 4. Updates lead's currentStageId
 * 5. Creates STAGE_CHANGE interaction log for audit trail
 * 
 * Important Business Logic:
 * - This is the ONLY way to move leads to Closed Won/Lost stages
 * - Moving to final stages (isFinal: true) marks the deal outcome
 * - Archiving is separate - archived Closed Won/Lost still count in metrics
 * 
 * Response: Updated lead object with new stage details
 */
router.put("/:id/leads/:leadId/stage", authenticate, async (req, res) => {
  try {
    const { id, leadId } = req.params;
    const { stageId } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check campaign access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    if (!stageId) {
      return res.status(400).json({ error: "stageId is required" });
    }

    // Verify lead belongs to this campaign
    const lead = await prisma.lead.findUnique({
      where: { id: leadId as string },
      select: { campaignId: true, currentStageId: true, firstName: true, lastName: true },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (lead.campaignId !== id) {
      return res.status(400).json({ error: "Lead does not belong to this campaign" });
    }

    // Verify stage exists and belongs to the campaign's pipeline
    const [stage, campaign] = await Promise.all([
      prisma.pipelineStage.findUnique({ where: { id: stageId } }),
      prisma.campaign.findUnique({ where: { id }, select: { pipelineId: true } }),
    ]);

    if (!stage) {
      return res.status(404).json({ error: "Stage not found" });
    }

    if (!campaign || stage.pipelineId !== campaign.pipelineId) {
      return res.status(400).json({ error: "Stage does not belong to this campaign's pipeline" });
    }

    // Update lead stage and create interaction log
    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId as string },
        data: { currentStageId: stageId },
        include: {
          currentStage: {
            select: {
              id: true,
              name: true,
              color: true,
              order: true,
              isFinal: true,
            },
          },
        },
      }),
      prisma.interaction.create({
        data: {
          leadId: leadId as string,
          type: "STAGE_CHANGE",
          content: `Stage changed to ${stage.name}`,
          createdById: userId,
        },
      }),
    ]);

    res.json(updatedLead);
  } catch (error) {
    console.error("Error moving lead to stage:", error);
    res.status(500).json({ error: "Failed to move lead to stage" });
  }
});

/**
 * PUT /campaigns/:id/leads/:leadId/archive
 * Archive or unarchive a lead
 * 
 * Path Parameters:
 * - id: Campaign UUID
 * - leadId: Lead UUID
 * 
 * Request Body:
 * - isArchived: boolean - true to archive, false to unarchive
 * - reason: string (optional) - Reason for archiving (stored in archivedReason)
 * 
 * Critical Business Logic:
 * - Archived leads from Closed Won/Lost stages STILL COUNT in metrics
 * - Archived leads from other stages DO NOT appear in active pipeline
 * - Archiving is separate from deal outcome (Won/Lost)
 * - Creates NOTE interaction for audit trail
 * 
 * Use Cases:
 * - Archive won deals after contract signing (still counted as won)
 * - Archive lost deals to clean up pipeline (still counted as lost)
 * - Archive inactive leads from active stages (removes from pipeline view)
 * 
 * Response: Updated lead object with archive status and timestamp
 */
router.put("/:id/leads/:leadId/archive", authenticate, async (req, res) => {
  try {
    const { id, leadId } = req.params;
    const { isArchived, reason } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check campaign access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    if (typeof isArchived !== "boolean") {
      return res.status(400).json({ error: "isArchived must be a boolean" });
    }

    // Verify lead belongs to this campaign
    const lead = await prisma.lead.findUnique({
      where: { id: leadId as string },
      select: { campaignId: true, firstName: true, lastName: true },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (lead.campaignId !== id) {
      return res.status(400).json({ error: "Lead does not belong to this campaign" });
    }

    // Update lead archive status
    const updatedLead = await prisma.lead.update({
      where: { id: leadId as string },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
        archivedReason: isArchived ? reason || null : null,
      },
      include: {
        currentStage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
      },
    });

    // Create interaction log
    await prisma.interaction.create({
      data: {
        leadId: leadId as string,
        type: "NOTE",
        content: isArchived 
          ? `Lead archived${reason ? `: ${reason}` : ""}`
          : "Lead unarchived",
        createdById: userId,
      },
    });

    res.json(updatedLead);
  } catch (error) {
    console.error("Error archiving/unarchiving lead:", error);
    res.status(500).json({ error: "Failed to update lead archive status" });
  }
});

// Bulk archive leads
router.post("/:id/leads/bulk-archive", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { leadIds, reason } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check campaign access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: "leadIds must be a non-empty array" });
    }

    // Verify all leads belong to this campaign
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, campaignId: id },
      select: { id: true },
    });

    if (leads.length !== leadIds.length) {
      return res.status(400).json({ error: "One or more leads not found or don't belong to this campaign" });
    }

    // Archive leads and create interaction logs
    const [updated] = await prisma.$transaction([
      prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archivedReason: reason || null,
        },
      }),
      ...leadIds.map((leadId: string) =>
        prisma.interaction.create({
          data: {
            leadId,
            type: "NOTE",
            content: `Lead archived${reason ? `: ${reason}` : ""}`,
            createdById: userId,
          },
        })
      ),
    ]);

    res.json({ message: `Archived ${updated.count} leads`, count: updated.count });
  } catch (error) {
    console.error("Error bulk archiving leads:", error);
    res.status(500).json({ error: "Failed to archive leads" });
  }
});

/**
 * PUT /campaigns/:id/leads/:leadId/convert-to-lead
 * Convert an archived lead back to an active lead
 * 
 * Path Parameters:
 * - id: Campaign UUID
 * - leadId: Lead UUID (must be archived)
 * 
 * Request Body:
 * - stageId: Target pipeline stage UUID (must be a valid active stage)
 * 
 * Workflow:
 * 1. Validates lead is currently archived
 * 2. User selects which active pipeline stage to restore lead to
 * 3. Unarchives lead (sets isArchived = false)
 * 4. Moves lead to selected stage
 * 5. Clears archive metadata (archivedAt, archivedReason)
 * 6. Creates interaction logs for audit trail
 * 
 * Use Cases:
 * - Reactivate accidentally archived leads
 * - Bring back old leads when new opportunities arise
 * - Restore archived Closed Won/Lost deals to renegotiate
 * 
 * Response: Updated lead object with new active status and stage
 */
router.put("/:id/leads/:leadId/convert-to-lead", authenticate, async (req, res) => {
  try {
    const { id, leadId } = req.params;
    const { stageId } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check campaign access
    const hasAccess = await checkCampaignAccess(id as string, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    if (!stageId) {
      return res.status(400).json({ error: "stageId is required" });
    }

    // Verify lead belongs to this campaign and is archived
    const lead = await prisma.lead.findUnique({
      where: { id: leadId as string },
      select: { 
        campaignId: true, 
        firstName: true, 
        lastName: true,
        isArchived: true,
        currentStage: {
          select: {
            name: true,
            isFinal: true
          }
        }
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (lead.campaignId !== id) {
      return res.status(400).json({ error: "Lead does not belong to this campaign" });
    }

    if (!lead.isArchived) {
      return res.status(400).json({ error: "Lead is not archived" });
    }

    // Verify the target stage exists and belongs to the campaign's pipeline
    const campaign = await prisma.campaign.findUnique({
      where: { id: id as string },
      select: { 
        pipelineId: true,
        pipeline: {
          select: {
            stages: {
              where: { id: stageId },
              select: { id: true, name: true }
            }
          }
        }
      },
    });

    if (!campaign?.pipeline?.stages || campaign.pipeline.stages.length === 0) {
      return res.status(400).json({ error: "Invalid stage for this campaign's pipeline" });
    }

    const targetStage = campaign.pipeline.stages[0];
    if (!targetStage) {
      return res.status(400).json({ error: "Target stage not found" });
    }

    // Update lead to unarchive and move to selected stage
    const updatedLead = await prisma.lead.update({
      where: { id: leadId as string },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedReason: null,
        currentStageId: stageId,
      },
      include: {
        currentStage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
      },
    });

    // Create interaction logs
    await prisma.interaction.createMany({
      data: [
        {
          leadId: leadId as string,
          type: "NOTE",
          content: `Lead converted back from archived (was in ${lead.currentStage?.name})`,
          createdById: userId,
        },
        {
          leadId: leadId as string,
          type: "STAGE_CHANGE",
          content: `Stage changed to ${targetStage.name}`,
          createdById: userId,
        }
      ]
    });

    res.json(updatedLead);
  } catch (error) {
    console.error("Error converting archived lead to active lead:", error);
    res.status(500).json({ error: "Failed to convert lead" });
  }
});

export default router;

import { Router } from "express";
import prisma from "@db/client";
import { authenticate, requireRole } from "../middleware/auth";
import {
  createLeadSchema,
  updateLeadSchema,
  createPropertyInterestSchema,
  updatePropertyInterestSchema,
  createNoteSchema,
  createDocumentSchema,
  bulkImportLeadsSchema,
} from "@repo/zod";
import multer from "multer";
import * as XLSX from "xlsx";
import axios from "axios";
import { getAutoAssignmentOrder, assignLeadsRoundRobin } from "../lib/auto-assign";

const router = Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for bulk imports
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
    }
  },
});

// Helper to check campaign access
const canAccessCampaign = async (campaignId: string, userId: string, userRole: string) => {
  if (userRole === "ADMIN" || userRole === "MANAGER") return true;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { assignedToIds: true },
  });

  return campaign && campaign.assignedToIds.includes(userId);
};

// Get all leads (filtered by campaign access)
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    console.log("Fetching leads for user:", userId, "with role:", userRole);
    const { campaignId, stageId, assignedToId, leadType, isArchived } = req.query;

    const where: any = {};
    const employeeRoles = ["EMPLOYEE", "TELE_CALLER", "FIELD_EXECUTIVE", "TEAM_LEADER"];

    // Only filter by isArchived if explicitly provided
    if (isArchived !== undefined) {
      where.isArchived = isArchived === "true";
    }

    // Campaign filter
    if (campaignId) {
      console.log("Campaign ID provided:", campaignId);
      const hasAccess = await canAccessCampaign(campaignId as string, userId, userRole);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this campaign" });
      }
      where.campaignId = campaignId;
    } else if (employeeRoles.includes(userRole)) {
      console.log("Entering employee campaign filter. User role is:", userRole);
      // Employees see leads from their assigned campaigns OR leads directly assigned to them
      const assignedCampaigns = await prisma.campaign.findMany({
        where: { assignedToIds: { has: userId } },
        select: { id: true },
      });
      const assignedIds = assignedCampaigns.map((c: { id: string }) => c.id);
      console.log("Assigned campaigns:", assignedIds);

      where.OR = [
        { campaignId: { in: assignedIds } },
        { assignedToId: userId }
      ];
    } else {
      console.log("Applying NO filtering. User role:", userRole);
    }

    if (stageId) {
      where.currentStageId = stageId;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    } else if (employeeRoles.includes(userRole)) {
      console.log("Filtering by assigned lead to user:", userId);
      // Employees must see leads assigned to them. 
      // If we are already filtering by assigned campaigns above, 
      // adding assignedToId here acts as an additional restrictor.
      where.assignedToId = userId;
    }

    if (leadType) {
      where.leadType = leadType;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            pipeline: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        currentStage: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
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
          select: {
            interactions: true,
            tasks: true,
            meetings: true,
            notes: true,
            properties: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log("Query 'where' clause:", JSON.stringify(where, null, 2));
    console.log("Leads returned:", leads.length);

    res.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Get lead statistics
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { campaignId } = req.query;

    let where: any = { isArchived: false };

    if (campaignId) {
      where.campaignId = campaignId;
    } else if (["EMPLOYEE", "TELE_CALLER", "FIELD_EXECUTIVE", "TEAM_LEADER"].includes(userRole)) {
      const assignedCampaigns = await prisma.campaign.findMany({
        where: { assignedToIds: { has: userId } },
        select: { id: true },
      });
      const assignedIds = assignedCampaigns.map((c: { id: string }) => c.id);

      where.OR = [
        { campaignId: { in: assignedIds } },
        { assignedToId: userId }
      ];
    }

    const [total, byType, byStage, followUps] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ["leadType"],
        where,
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ["currentStageId"],
        where,
        _count: true,
      }),
      prisma.lead.count({
        where: {
          ...where,
          nextFollowUpAt: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            gte: new Date(),
          },
        },
      }),
    ]);

    res.json({
      total,
      byType: byType.map((item: any) => ({
        type: item.leadType,
        count: item._count,
      })),
      byStage: byStage.map((item: any) => ({
        stageId: item.currentStageId,
        count: item._count,
      })),
      upcomingFollowUps: followUps,
    });
  } catch (error) {
    console.error("Error fetching lead stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get single lead
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: {
          include: {
            pipeline: {
              include: {
                stages: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
        currentStage: true,
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        interactions: {
          include: {
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { occurredAt: "desc" },
          take: 50,
        },
        properties: {
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
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
        },
        meetings: {
          include: {
            organizer: {
              select: {
                id: true,
                fullName: true,
              },
            },
            attendees: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: { startTime: "asc" },
        },
        notes: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check access
    const hasAccess = await canAccessCampaign(lead.campaignId, userId, userRole);
    if (!hasAccess && lead.assignedToId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// Create lead
router.post("/", authenticate, async (req, res) => {
  try {
    const validatedData = createLeadSchema.parse(req.body);
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Check campaign access
    const hasAccess = await canAccessCampaign(validatedData.campaignId, userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this campaign" });
    }

    // Verify campaign and stage exist
    const campaign = await prisma.campaign.findUnique({
      where: { id: validatedData.campaignId },
      include: {
        pipeline: {
          include: {
            stages: true,
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const stageExists = campaign.pipeline.stages.some((s: any) => s.id === validatedData.currentStageId);
    if (!stageExists) {
      return res.status(400).json({ error: "Invalid stage for this campaign's pipeline" });
    }

    const lead = await prisma.lead.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        mobile: validatedData.mobile,
        alternatePhone: validatedData.alternatePhone,
        leadType: validatedData.leadType,
        propertyTypePreference: validatedData.propertyTypePreference,
        budgetMin: validatedData.budgetMin,
        budgetMax: validatedData.budgetMax,
        locationPreference: validatedData.locationPreference,
        bedroomsMin: validatedData.bedroomsMin,
        bathroomsMin: validatedData.bathroomsMin,
        squareFeetMin: validatedData.squareFeetMin,
        moveInTimeline: validatedData.moveInTimeline,
        currentHousingStatus: validatedData.currentHousingStatus,
        preApprovalStatus: validatedData.preApprovalStatus,
        preApprovalAmount: validatedData.preApprovalAmount,
        campaignId: validatedData.campaignId,
        currentStageId: validatedData.currentStageId,
        priority: validatedData.priority,
        tags: validatedData.tags,
        assignedToId: validatedData.assignedToId || userId,
        initialNotes: validatedData.initialNotes,
        nextFollowUpAt: validatedData.nextFollowUpAt ? new Date(validatedData.nextFollowUpAt) : null,
        customFields: validatedData.customFields,
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
    });

    // Create a follow-up task if nextFollowUpAt is set
    if (validatedData.nextFollowUpAt) {
      await prisma.task.create({
        data: {
          title: `Follow up with ${validatedData.firstName} ${validatedData.lastName}`,
          description: `Follow-up scheduled for lead ${validatedData.firstName} ${validatedData.lastName}${validatedData.email ? ` (${validatedData.email})` : ''}`,
          type: "FOLLOW_UP",
          priority: validatedData.priority || "MEDIUM",
          dueDate: new Date(validatedData.nextFollowUpAt),
          assignedToId: validatedData.assignedToId || userId,
          leadId: lead.id,
        },
      });
    }

    res.status(201).json(lead);
  } catch (error: any) {
    console.error("Error creating lead:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// Update lead
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateLeadSchema.parse(req.body);
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Get existing lead
    const existingLead = await prisma.lead.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check access
    const hasAccess = await canAccessCampaign(existingLead.campaignId, userId, userRole);
    if (!hasAccess && existingLead.assignedToId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate stage change if provided
    if (validatedData.currentStageId) {
      const stage = await prisma.pipelineStage.findFirst({
        where: {
          id: validatedData.currentStageId,
          pipelineId: existingLead.campaign.pipelineId,
        },
      });

      if (!stage) {
        return res.status(400).json({ error: "Invalid stage for this lead's pipeline" });
      }

      // Create interaction for stage change
      if (validatedData.currentStageId !== existingLead.currentStageId) {
        // Get current stage name
        const currentStage = await prisma.pipelineStage.findUnique({
          where: { id: existingLead.currentStageId },
        });

        await prisma.interaction.create({
          data: {
            lead: { connect: { id } },
            type: "STAGE_CHANGE",
            subject: "Stage Changed",
            content: `Stage changed from ${currentStage?.name || 'Unknown'} to ${stage.name}`,
            direction: "OUTBOUND",
            createdBy: { connect: { id: userId } },
            occurredAt: new Date(),
          },
        });
      }
    }

    const updateData: any = { ...validatedData };
    if (validatedData.nextFollowUpAt) {
      updateData.nextFollowUpAt = new Date(validatedData.nextFollowUpAt);
    }
    if (validatedData.isArchived && !existingLead.isArchived) {
      updateData.archivedAt = new Date();
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
    });

    // Create or update follow-up task if nextFollowUpAt is set or changed
    if (validatedData.nextFollowUpAt) {
      const nextFollowUpDate = new Date(validatedData.nextFollowUpAt);

      // Check if there's an existing follow-up task for this lead
      const existingTask = await prisma.task.findFirst({
        where: {
          leadId: id,
          type: "FOLLOW_UP",
          isCompleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingTask) {
        // Update the existing task's due date
        await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            dueDate: nextFollowUpDate,
            assignedToId: validatedData.assignedToId || existingLead.assignedToId,
          },
        });
      } else {
        // Create a new follow-up task
        await prisma.task.create({
          data: {
            title: `Follow up with ${lead.firstName} ${lead.lastName}`,
            description: `Follow-up scheduled for lead ${lead.firstName} ${lead.lastName}${lead.email ? ` (${lead.email})` : ''}`,
            type: "FOLLOW_UP",
            priority: validatedData.priority || existingLead.priority,
            dueDate: nextFollowUpDate,
            assignedToId: validatedData.assignedToId || existingLead.assignedToId,
            leadId: id,
          },
        });
      }
    }

    res.json(lead);
  } catch (error: any) {
    console.error("Error updating lead:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(500).json({ error: "Failed to update lead" });
  }
});

// Update lead stage
router.patch("/:id/stage", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStageId } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    if (!currentStageId) {
      return res.status(400).json({ error: "currentStageId is required" });
    }

    // Get existing lead
    const existingLead = await prisma.lead.findUnique({
      where: { id },
      include: { campaign: true, currentStage: true },
    });

    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Check access
    const hasAccess = await canAccessCampaign(existingLead.campaignId, userId, userRole);
    if (!hasAccess && existingLead.assignedToId !== userId) {
      return res.status(403).json({ error: "Access denied to this lead" });
    }

    if (existingLead.currentStageId === currentStageId) {
      return res.json(existingLead); // No change needed
    }

    // Verify stage exists and belongs to campaign's pipeline
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: currentStageId },
      include: { pipeline: { include: { campaigns: true } } },
    });

    if (!stage) {
      return res.status(404).json({ error: "Pipeline stage not found" });
    }

    // Update lead and log interaction
    const [lead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: { currentStageId },
        include: {
          campaign: { select: { id: true, name: true } },
          currentStage: { select: { id: true, name: true, color: true } },
          assignedTo: { select: { id: true, fullName: true } },
        },
      }),
      prisma.interaction.create({
        data: {
          leadId: id,
          type: "STAGE_CHANGE",
          subject: "Stage Changed",
          content: `Stage changed from ${existingLead.currentStage?.name || 'Unknown'} to ${stage.name}`,
          direction: "OUTBOUND",
          createdById: userId,
          occurredAt: new Date(),
        },
      })
    ]);

    res.json(lead);
  } catch (error: any) {
    console.error("Error updating lead stage:", error);
    res.status(500).json({ error: "Failed to update lead stage" });
  }
});

// Add property interest
router.post("/:id/properties", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createPropertyInterestSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
    });
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    const interest = await prisma.propertyInterest.create({
      data: {
        lead: { connect: { id } },
        property: { connect: { id: validatedData.propertyId } },
        status: validatedData.status,
        notes: validatedData.notes,
        viewedAt: validatedData.viewedAt ? new Date(validatedData.viewedAt) : null,
        rating: validatedData.rating,
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

    // Create interaction for property showing if viewed
    if (validatedData.status === "TOURED" || validatedData.viewedAt) {
      await prisma.interaction.create({
        data: {
          lead: { connect: { id } },
          type: "PROPERTY_SHOWING",
          subject: `Property Showing: ${property.address}`,
          content: validatedData.notes || `Showed property at ${property.address}`,
          direction: "OUTBOUND",
          createdBy: { connect: { id: userId } },
          occurredAt: validatedData.viewedAt ? new Date(validatedData.viewedAt) : new Date(),
        },
      });
    }

    res.status(201).json(interest);
  } catch (error: any) {
    console.error("Error adding property interest:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Lead already has interest in this property" });
    }
    res.status(500).json({ error: "Failed to add property interest" });
  }
});

// Update property interest
router.put("/:id/properties/:propertyInterestId", authenticate, async (req, res) => {
  try {
    const { id, propertyInterestId } = req.params;
    const validatedData = updatePropertyInterestSchema.parse(req.body);

    // Verify interest belongs to lead
    const existingInterest = await prisma.propertyInterest.findFirst({
      where: { id: propertyInterestId, leadId: id },
    });

    if (!existingInterest) {
      return res.status(404).json({ error: "Property interest not found" });
    }

    const updateData: any = { ...validatedData };
    if (validatedData.viewedAt) {
      updateData.viewedAt = new Date(validatedData.viewedAt);
    }

    const interest = await prisma.propertyInterest.update({
      where: { id: propertyInterestId },
      data: updateData,
      include: {
        property: true,
      },
    });

    res.json(interest);
  } catch (error: any) {
    console.error("Error updating property interest:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Property interest not found" });
    }
    res.status(500).json({ error: "Failed to update property interest" });
  }
});

// Add note to lead
router.post("/:id/notes", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createNoteSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const note = await prisma.note.create({
      data: {
        content: validatedData.content,
        isPinned: validatedData.isPinned || false,
        leadId: id,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json(note);
  } catch (error: any) {
    console.error("Error adding note:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to add note" });
  }
});

// Add document to lead
router.post("/:id/documents", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createDocumentSchema.parse(req.body);

    const document = await prisma.document.create({
      data: {
        name: validatedData.name,
        url: validatedData.url || "",
        fileType: validatedData.isLink ? "link" : "file",
        category: validatedData.category,
        isLink: validatedData.isLink,
        leadId: id,
      },
    });

    res.status(201).json(document);
  } catch (error: any) {
    console.error("Error adding document:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to add document" });
  }
});

// Delete lead (admin only)
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.lead.delete({
      where: { id },
    });

    res.json({ message: "Lead deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// ================================
// IMPORT ENDPOINTS
// ================================

// Parse spreadsheet or Google Sheets URL
router.post("/import/parse", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { sourceType, url, driveFileId } = req.body;
    let workbook: XLSX.WorkBook;

    if (sourceType === "GOOGLE_DRIVE_FILE" && driveFileId) {
      const { downloadDriveFile } = await import("../lib/google-drive");
      const userId = (req as any).user.userId;
      const buffer = await downloadDriveFile(userId, driveFileId);

      if (!buffer) {
        return res.status(400).json({ error: "Failed to download file from Google Drive. Please ensure you have granted Drive permissions." });
      }

      workbook = XLSX.read(buffer, { type: "buffer" });
    } else if (sourceType === "GOOGLE_SHEETS_URL" && url) {
      // Convert Google Sheets URL to export format
      let exportUrl = url;

      // Handle different Google Sheets URL formats
      if (url.includes("/edit")) {
        exportUrl = url.replace(/\/edit.*/, "/export?format=xlsx");
      } else if (url.includes("docs.google.com/spreadsheets/d/")) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
        }
      }

      // Fetch the spreadsheet
      const response = await axios.get(exportUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      workbook = XLSX.read(response.data, { type: "buffer" });
    } else if (req.file) {
      // Parse uploaded file
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } else {
      return res.status(400).json({ error: "No file or URL provided" });
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: "No sheets found in spreadsheet" });
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return res.status(400).json({ error: "Failed to read worksheet" });
    }

    // Convert to JSON
    const data: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (data.length === 0) {
      return res.status(400).json({ error: "Spreadsheet is empty" });
    }

    // Extract column headers
    const headers = Object.keys(data[0]);

    // Return headers, preview (first 50 rows for display), and all rows (up to 1000 for safety)
    res.json({
      headers,
      preview: data.slice(0, 50),
      totalRows: data.length,
      sheetName,
      allRows: data.slice(0, 1000), // Limit to 1000 rows for safety
    });
  } catch (error: any) {
    console.error("Error parsing spreadsheet:", error);

    if (error.isAxiosError) {
      if (error.response?.status === 404 || error.response?.status === 401 || error.response?.status === 403) {
        return res.status(400).json({
          error: "Could not access the Google Sheet. Please make sure the link is set to 'Anyone with the link can view'."
        });
      }
      return res.status(400).json({
        error: "Failed to fetch Google Sheets.",
        details: error.message
      });
    }

    if (error.message?.includes("ENOTFOUND") || error.message?.includes("timeout")) {
      return res.status(400).json({ error: "Failed to fetch Google Sheets. Please check your internet connection and the URL." });
    }

    res.status(500).json({
      error: "Failed to parse spreadsheet",
      details: error.message
    });
  }
});

// Bulk import leads
router.post("/import/bulk", authenticate, upload.single("file"), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Parse the import configuration from request body
    const importData = JSON.parse(req.body.importData);
    const validated = bulkImportLeadsSchema.parse(importData);

    const {
      campaignId,
      defaultStageId,
      defaultAssignedToId,
      defaultPriority,
      duplicateHandling,
      duplicateCheckFields,
      columnMappings,
      rows,
      assignmentMode,
    } = validated;

    // Verify campaign exists and user has access
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { pipeline: { include: { stages: true } } },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Verify default stage belongs to campaign's pipeline
    const stageExists = campaign.pipeline.stages.some((s: { id: string }) => s.id === defaultStageId);
    if (!stageExists) {
      return res.status(400).json({ error: "Default stage does not belong to campaign's pipeline" });
    }

    // Create mapping lookup
    const mappingLookup = new Map<string, { targetField: string; transform: string; isCustomField?: boolean; customFieldName?: string }>();
    columnMappings.forEach((m) => {
      mappingLookup.set(m.sourceColumn, {
        targetField: m.targetField,
        transform: m.transformFunction || "NONE",
        isCustomField: m.isCustomField,
        customFieldName: m.customFieldName,
      });
    });

    // Helper function to normalize enum values
    const normalizeEnumValue = (value: any, fieldName: string): any => {
      if (!value) return null;
      const strValue = String(value).trim().toUpperCase().replace(/\s+/g, "_");

      // Move-in timeline mappings
      const moveInTimelineMap: Record<string, string> = {
        "WITHIN_1_MONTH": "ASAP",
        "WITHIN_3_MONTHS": "ONE_TO_THREE_MONTHS",
        "WITHIN_6_MONTHS": "THREE_TO_SIX_MONTHS",
        "WITHIN_1_YEAR": "SIX_TO_TWELVE_MONTHS",
        "FLEXIBLE": "JUST_BROWSING",
        "1-3_MONTHS": "ONE_TO_THREE_MONTHS",
        "3-6_MONTHS": "THREE_TO_SIX_MONTHS",
        "6-12_MONTHS": "SIX_TO_TWELVE_MONTHS",
        "1_YEAR_PLUS": "OVER_A_YEAR",
      };

      // Pre-approval status mappings
      const preApprovalMap: Record<string, string> = {
        "APPROVED": "PRE_APPROVED",
        "QUALIFIED": "PRE_QUALIFIED",
        "NOT_APPLICABLE": "NOT_NEEDED",
        "N/A": "NOT_NEEDED",
        "NA": "NOT_NEEDED",
        "NONE": "NOT_NEEDED",
      };

      // Housing status mappings
      const housingStatusMap: Record<string, string> = {
        "OWNER_OCCUPIED": "OWNS_HOME",
        "OWNS": "OWNS_HOME",
        "RENTER": "RENTING",
        "TENANT": "RENTING",
        "WITH_FAMILY": "LIVING_WITH_FAMILY",
        "NOT_APPLICABLE": "OTHER",
        "N/A": "OTHER",
        "NA": "OTHER",
        "NONE": "OTHER",
      };

      if (fieldName === "moveInTimeline" && moveInTimelineMap[strValue]) {
        return moveInTimelineMap[strValue];
      }
      if (fieldName === "preApprovalStatus" && preApprovalMap[strValue]) {
        return preApprovalMap[strValue];
      }
      if (fieldName === "currentHousingStatus" && housingStatusMap[strValue]) {
        return housingStatusMap[strValue];
      }

      return strValue;
    };

    // Helper function to transform values
    const transformValue = (value: any, transformFn: string, fieldName: string = ""): any => {
      if (value === null || value === undefined || value === "") return null;

      const strValue = String(value).trim();
      if (strValue === "") return null;

      switch (transformFn) {
        case "UPPERCASE":
          const uppercased = strValue.toUpperCase();
          // Apply enum normalization for enum fields
          if (fieldName === "moveInTimeline" || fieldName === "preApprovalStatus" || fieldName === "currentHousingStatus" || fieldName === "leadType") {
            return normalizeEnumValue(uppercased, fieldName);
          }
          return uppercased;
        case "LOWERCASE":
          return strValue.toLowerCase();
        case "TRIM":
          return strValue;
        case "SPLIT_COMMA":
          return strValue.split(",").map(v => v.trim()).filter(v => v);
        case "PARSE_NUMBER":
          const num = parseFloat(strValue.replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? null : num;
        case "PARSE_DATE":
          const date = new Date(strValue);
          return isNaN(date.getTime()) ? null : date.toISOString();
        default:
          // Excel sheet_to_json often parses numeric strings (like phone numbers) as numbers.
          // Convert them back to strings unless the target field is actually a number.
          const numberFields = ["budgetMin", "budgetMax", "bedroomsMin", "bathroomsMin", "squareFeetMin", "preApprovalAmount", "score"];
          if (typeof value === "number" && !numberFields.includes(fieldName)) {
            return strValue;
          }
          return value;
      }
    };

    // Process each row
    const results: Array<{ row: number; status: "success" | "error" | "skipped"; message?: string; leadId?: string }> = [];
    const successfulLeads: string[] = [];

    let assignmentOrder: string[] = [];
    let assignmentIndex = 0;

    if (assignmentMode === "AUTO") {
      assignmentOrder = await getAutoAssignmentOrder(campaignId, userId);
    }

    const rowsToCreate: { leadData: any; rowNumber: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Check if the row is entirely empty (all cells are blank/whitespace)
      const isRowEmpty = Object.values(row).every(v => !v || String(v).trim() === "");
      if (isRowEmpty) continue;

      const rowNumber = i + 1;

      try {
        // Build lead data from mappings
        const leadData: any = {
          campaignId,
          currentStageId: defaultStageId,
          assignedToId: assignmentMode === "MANUAL" ? (defaultAssignedToId || userId) : undefined,
          priority: defaultPriority,
        };

        const customFieldsData: Record<string, any> = {};

        // Standard fields in Lead model (not custom)
        const standardFields = [
          "firstName", "lastName", "email", "mobile", "alternatePhone", "leadType",
          "propertyTypePreference", "budgetMin", "budgetMax", "locationPreference",
          "bedroomsMin", "bathroomsMin", "squareFeetMin", "moveInTimeline",
          "currentHousingStatus", "preApprovalStatus", "preApprovalAmount",
          "priority", "tags", "initialNotes", "nextFollowUpAt"
        ];

        // Apply column mappings
        for (const [sourceCol, mapping] of mappingLookup.entries()) {
          const rawValue = row[sourceCol];
          const transformedValue = transformValue(rawValue, mapping.transform, mapping.targetField);

          if (transformedValue !== null && transformedValue !== undefined) {
            // Check if this is a custom field
            if (mapping.isCustomField || !standardFields.includes(mapping.targetField)) {
              const fieldName = mapping.customFieldName || mapping.targetField;
              customFieldsData[fieldName] = transformedValue;
            } else {
              leadData[mapping.targetField] = transformedValue;

              // Protect Enum fields from crashing Prisma if user maps a random string/number
              const validEnums: Record<string, string[]> = {
                leadType: ["BUYER", "SELLER", "INVESTOR", "RENTER", "BUYER_SELLER"],
                priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
                moveInTimeline: ["ASAP", "ONE_TO_THREE_MONTHS", "THREE_TO_SIX_MONTHS", "SIX_TO_TWELVE_MONTHS", "OVER_A_YEAR", "JUST_BROWSING"],
                currentHousingStatus: ["RENTING", "OWNS_HOME", "LIVING_WITH_FAMILY", "OTHER"],
                preApprovalStatus: ["NOT_STARTED", "IN_PROGRESS", "PRE_QUALIFIED", "PRE_APPROVED", "NOT_NEEDED"],
              };

              if (validEnums[mapping.targetField] && !validEnums[mapping.targetField].includes(String(transformedValue))) {
                delete leadData[mapping.targetField];
              }
            }
          }
        }

        // Attach custom fields if any
        if (Object.keys(customFieldsData).length > 0) {
          leadData.customFields = customFieldsData;
        }

        // Ensure required fields (First name, and either Email or Mobile)
        if (!leadData.firstName) {
          results.push({
            row: rowNumber,
            status: "error",
            message: "Missing required field: First Name",
          });
          continue;
        }

        if (!leadData.email && !leadData.mobile) {
          results.push({
            row: rowNumber,
            status: "error",
            message: "Missing required field: Provide either an Email or a Mobile Number",
          });
          continue;
        }

        // Fill missing last name with empty string for Prisma
        if (!leadData.lastName) leadData.lastName = "";

        // Check for duplicates
        if (duplicateHandling !== "CREATE_NEW" && (leadData.email || leadData.mobile)) {
          const duplicateWhere: any = { campaignId, OR: [] };

          if (duplicateCheckFields.includes("email") && leadData.email) {
            duplicateWhere.OR.push({ email: leadData.email });
          }
          if (duplicateCheckFields.includes("mobile") && leadData.mobile) {
            duplicateWhere.OR.push({ mobile: leadData.mobile });
          }
          if (duplicateCheckFields.includes("both") && leadData.email && leadData.mobile) {
            duplicateWhere.OR.push({
              AND: [{ email: leadData.email }, { mobile: leadData.mobile }],
            });
          }

          if (duplicateWhere.OR.length > 0) {
            const existingLead = await prisma.lead.findFirst({ where: duplicateWhere });

            if (existingLead) {
              if (duplicateHandling === "SKIP") {
                results.push({
                  row: rowNumber,
                  status: "skipped",
                  message: `Duplicate found (${existingLead.email || existingLead.mobile})`,
                  leadId: existingLead.id,
                });
                continue;
              } else if (duplicateHandling === "UPDATE") {
                const assignedToIdForUpdate = assignmentMode === "AUTO"
                  ? assignmentOrder[assignmentIndex % assignmentOrder.length]
                  : (leadData.assignedToId || userId);
                
                if (assignmentMode === "AUTO") {
                  assignmentIndex++;
                }

                const updated = await prisma.lead.update({
                  where: { id: existingLead.id },
                  data: { ...leadData, assignedToId: assignedToIdForUpdate },
                });

                if (leadData.nextFollowUpAt) {
                  const nextFollowUpDate = new Date(leadData.nextFollowUpAt);

                  const existingTask = await prisma.task.findFirst({
                    where: {
                      leadId: existingLead.id,
                      type: "FOLLOW_UP",
                      isCompleted: false,
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                  });

                  if (existingTask) {
                    await prisma.task.update({
                      where: { id: existingTask.id },
                      data: {
                        dueDate: nextFollowUpDate,
                        assignedToId: assignedToIdForUpdate,
                      },
                    });
                  } else {
                    await prisma.task.create({
                      data: {
                        title: `Follow up with ${updated.firstName} ${updated.lastName}`,
                        description: `Follow-up scheduled for lead ${updated.firstName} ${updated.lastName}${updated.email ? ` (${updated.email})` : ''}`,
                        type: "FOLLOW_UP",
                        priority: updated.priority || "MEDIUM",
                        dueDate: nextFollowUpDate,
                        assignedToId: assignedToIdForUpdate,
                        leadId: existingLead.id,
                      },
                    });
                  }
                }

                results.push({
                  row: rowNumber,
                  status: "success",
                  message: "Updated existing lead",
                  leadId: updated.id,
                });
                successfulLeads.push(updated.id);
                continue;
              }
            }
          }
        }

        rowsToCreate.push({ leadData, rowNumber });

      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);

        let errorMessage = "Unknown error";
        if (error.errors && Array.isArray(error.errors)) {
          errorMessage = error.errors.map((e: any) => e.message).join(", ");
        } else if (error.message) {
          errorMessage = error.message;
        }

        results.push({
          row: rowNumber,
          status: "error",
          message: errorMessage,
        });
      }
    }

    if (assignmentMode === "AUTO" && rowsToCreate.length > 0 && assignmentOrder.length > 1) {
      const autoAssignments = assignLeadsRoundRobin(rowsToCreate.length, assignmentOrder);
      rowsToCreate.forEach((item, idx) => {
        item.leadData.assignedToId = autoAssignments[idx];
      });
    }

    for (const { leadData, rowNumber } of rowsToCreate) {
      try {
        if (!leadData.assignedToId) {
          leadData.assignedToId = userId;
        }

        const validatedLead = createLeadSchema.parse(leadData);

        const newLead = await prisma.lead.create({
          data: validatedLead as any,
        });

        if (leadData.nextFollowUpAt) {
          await prisma.task.create({
            data: {
              title: `Follow up with ${newLead.firstName} ${newLead.lastName}`,
              description: `Follow-up scheduled for lead ${newLead.firstName} ${newLead.lastName}${newLead.email ? ` (${newLead.email})` : ''}`,
              type: "FOLLOW_UP",
              priority: newLead.priority || "MEDIUM",
              dueDate: new Date(leadData.nextFollowUpAt),
              assignedToId: newLead.assignedToId,
              leadId: newLead.id,
            },
          });
        }

        results.push({
          row: rowNumber,
          status: "success",
          message: "Lead created",
          leadId: newLead.id,
        });
        successfulLeads.push(newLead.id);

      } catch (error: any) {
        console.error(`Error creating lead at row ${rowNumber}:`, error);

        let errorMessage = "Unknown error";
        if (error.errors && Array.isArray(error.errors)) {
          errorMessage = error.errors.map((e: any) => e.message).join(", ");
        } else if (error.message) {
          errorMessage = error.message;
        }

        results.push({
          row: rowNumber,
          status: "error",
          message: errorMessage,
        });
      }
    }

    // Summary statistics
    const summary = {
      totalRows: rows.length,
      successful: results.filter(r => r.status === "success").length,
      skipped: results.filter(r => r.status === "skipped").length,
      failed: results.filter(r => r.status === "error").length,
    };

    res.json({
      summary,
      results,
      leadIds: successfulLeads,
    });

  } catch (error: any) {
    console.error("Error during bulk import:", error);

    if (error.errors && Array.isArray(error.errors)) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors.map((e: any) => e.message).join(", ")
      });
    }

    res.status(500).json({
      error: "Failed to import leads",
      details: error.message
    });
  }
});

// Bulk assign leads to a user
router.post("/bulk-assign", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { leadIds, assignedToId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: "leadIds array is required" });
    }

    if (!assignedToId) {
      return res.status(400).json({ error: "assignedToId is required" });
    }

    // Only ADMIN and MANAGER can bulk assign
    if (userRole !== "ADMIN" && userRole !== "MANAGER" && userRole !== "TEAM_LEADER") {
      return res.status(403).json({ error: "You do not have permission to bulk assign leads" });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, fullName: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({ error: "Target user not found or inactive" });
    }

    // Update all leads
    const result = await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { assignedToId },
    });

    res.json({
      message: `${result.count} lead(s) assigned to ${targetUser.fullName}`,
      count: result.count,
    });
  } catch (error) {
    console.error("Error bulk assigning leads:", error);
    res.status(500).json({ error: "Failed to bulk assign leads" });
  }
});

export default router;

import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "@db/client";
import { authenticate } from "../middleware/auth";
import { createTaskSchema } from "@repo/zod";
import { parsePagination, wantsPagination } from "../lib/pagination";

const isProd = process.env.NODE_ENV === "production";

const router = Router();

// ==== FOLLOW-UPS ROUTES (defined first to ensure proper matching) ====

// PATCH /tasks/follow-ups/:leadId - Clear follow-up date for a lead
router.patch("/follow-ups/:leadId", authenticate, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { role, userId } = req.user!;

    if (!isProd) console.log("Clear follow-up request:", { leadId, role, userId });

    // Check if lead exists and user has access
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      if (!isProd) console.log("Lead not found:", leadId);
      return res.status(404).json({ error: "Lead not found" });
    }

    // Employees can only clear their own leads' follow-ups
    if (role !== "ADMIN" && role !== "MANAGER" && lead.assignedToId !== userId) {
      if (!isProd) console.log("Access denied:", { leadAssignedToId: lead.assignedToId, userId });
      return res.status(403).json({ error: "Forbidden" });
    }

    // Clear the nextFollowUpAt date
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        nextFollowUpAt: null,
      },
    });

    if (!isProd) console.log("Follow-up cleared successfully:", updatedLead.id);
    res.json({ message: "Follow-up cleared", lead: updatedLead });
  } catch (error) {
    console.error("Clear follow-up error:", error);
    res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
  }
});

// GET /tasks/follow-ups - Get lead follow-ups as task-like items
router.get("/follow-ups", authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    
    // Employees see only their own leads
    // Admins/Managers see all leads
    const where = (role !== "ADMIN" && role !== "MANAGER")
      ? { assignedToId: userId, isArchived: false } 
      : { isArchived: false };
    
    const { from, to } = req.query;
    const followUpRange: any = { not: null };
    if (from) followUpRange.gte = new Date(from as string);
    if (to) followUpRange.lte = new Date(to as string);

    const leads = await prisma.lead.findMany({
      where: {
        ...where,
        nextFollowUpAt: followUpRange,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        nextFollowUpAt: true,
        currentStage: {
          select: {
            name: true,
            color: true,
          },
        },
        priority: true,
        assignedTo: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { nextFollowUpAt: "asc" },
    });
    
    res.json({ followUps: leads });
  } catch (error) {
    console.error("Get follow-ups error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tasks/follow-ups/stats - Get follow-up statistics
router.get("/follow-ups/stats", authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    // NOTE: isConverted was dropped from the Lead model (migration
    // 20260102044627) — filter on isArchived like the sibling route.
    const where = (role !== "ADMIN" && role !== "MANAGER")
      ? { assignedToId: userId, isArchived: false }
      : { isArchived: false };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [dueToday, upcoming, overdue] = await Promise.all([
      // Due today
      prisma.lead.count({
        where: {
          ...where,
          nextFollowUpAt: {
            not: null,
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Upcoming
      prisma.lead.count({
        where: {
          ...where,
          nextFollowUpAt: {
            not: null,
            gte: tomorrow,
          },
        },
      }),
      // Overdue
      prisma.lead.count({
        where: {
          ...where,
          nextFollowUpAt: {
            not: null,
            lt: today,
          },
        },
      }),
    ]);
    
    res.json({ dueToday, upcoming, overdue });
  } catch (error) {
    console.error("Get follow-up stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==== GENERAL TASK ROUTES ====

// GET /tasks - List all tasks for current user
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;

    // Employees see only their own tasks
    // Admins/Managers see all tasks
    const where: any = (role !== "ADMIN" && role !== "MANAGER") ? { assignedToId: userId } : {};

    const { search, isCompleted, leadId, from, to } = req.query;
    if (search && String(search).trim() !== "") {
      where.title = { contains: String(search).trim(), mode: "insensitive" };
    }
    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted === "true";
    }
    if (leadId) {
      where.leadId = leadId as string;
    }
    // Due-date range filter (powers day-scoped fetches like login reminders
    // without downloading the full task history)
    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from as string);
      if (to) where.dueDate.lte = new Date(to as string);
    }

    const include = {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          fullName: true,
        },
      },
    };

    if (wantsPagination(req.query)) {
      const { page, limit, skip } = parsePagination(req.query);
      const [tasks, total] = await Promise.all([
        prisma.task.findMany({ where, include, orderBy: { dueDate: "asc" }, skip, take: limit }),
        prisma.task.count({ where }),
      ]);
      return res.json({
        tasks,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }

    const tasks = await prisma.task.findMany({
      where,
      include,
      orderBy: { dueDate: "asc" },
    });

    res.json({ tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tasks/stats - Get task statistics
router.get("/stats", authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const where = (role !== "ADMIN" && role !== "MANAGER") ? { assignedToId: userId } : {};
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [dueToday, upcoming, expired, completed] = await Promise.all([
      prisma.task.count({
        where: {
          ...where,
          isCompleted: false,
          dueDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.task.count({
        where: {
          ...where,
          isCompleted: false,
          dueDate: { gte: tomorrow },
        },
      }),
      prisma.task.count({
        where: {
          ...where,
          isCompleted: false,
          dueDate: { lt: today },
        },
      }),
      prisma.task.count({
        where: {
          ...where,
          isCompleted: true,
        },
      }),
    ]);
    
    res.json({ dueToday, upcoming, expired, completed });
  } catch (error) {
    console.error("Get task stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /tasks - Create a new task
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;
    
    const validation = createTaskSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }
    
    const { title, description, priority, type, dueDate, assignedToId } = validation.data;
    const { leadId } = req.body;
    
    // Verify lead exists if provided
    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        res.status(404).json({ error: "Lead not found" });
        return;
      }
    }
    
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        type,
        dueDate: new Date(dueDate),
        leadId: leadId || null,
        assignedToId: assignedToId || userId,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    
    res.status(201).json({ task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /tasks/:id/complete - Toggle task completion
router.patch("/:id/complete", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;
    
    const existingTask = await prisma.task.findUnique({ where: { id } });
    
    if (!existingTask) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    
    // Employees can only toggle their own tasks
    if (role !== "ADMIN" && role !== "MANAGER" && existingTask.assignedToId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        isCompleted: !existingTask.isCompleted,
        completedAt: !existingTask.isCompleted ? new Date() : null,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
    
    res.json({ task });
  } catch (error) {
    console.error("Toggle task completion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /tasks/:id - Delete a task
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;
    
    const existingTask = await prisma.task.findUnique({ where: { id } });
    
    if (!existingTask) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    
    // Employees can only delete their own tasks
    if (role !== "ADMIN" && role !== "MANAGER" && existingTask.assignedToId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    
    await prisma.task.delete({ where: { id } });
    
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /tasks/cleanup-completed - Auto-delete completed tasks older than 1 day
router.post("/cleanup-completed", authenticate, async (_req: Request, res: Response) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const result = await prisma.task.deleteMany({
      where: {
        isCompleted: true,
        completedAt: {
          lt: oneDayAgo,
        },
      },
    });
    
    res.json({ message: `Deleted ${result.count} completed tasks`, count: result.count });
  } catch (error) {
    console.error("Cleanup completed tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

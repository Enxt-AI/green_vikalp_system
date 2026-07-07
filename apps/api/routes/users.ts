import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "@db/client";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /users - List all users (Admin only, for sharing/assignment)
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.user!;

    // Only admins and managers can see user list
    if (role === "EMPLOYEE") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
    });

    // Fetch call statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const calls = await prisma.interaction.findMany({
          where: {
            createdById: user.id,
            type: "CALL",
          },
          select: {
            subject: true,
          },
        });

        const totalCalls = calls.length;
        const connectedCalls = calls.filter(c => c.subject?.includes("Connected") && !c.subject?.includes("Not Connected") && !c.subject?.includes("Unconnected")).length;
        const unconnectedCalls = totalCalls - connectedCalls;

        return {
          ...user,
          stats: {
            totalCalls,
            connectedCalls,
            unconnectedCalls,
          },
        };
      })
    );

    res.json({ users: usersWithStats, total: usersWithStats.length });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;

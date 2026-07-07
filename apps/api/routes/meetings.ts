import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "@db/client";
import { authenticate } from "../middleware/auth";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  addEventToUserCalendar,
  removeEventFromUserCalendar,
} from "../lib/google-calendar";

const router = Router();

// GET /meetings - List all meetings for current user
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;

    // Role-based filtering:
    // EMPLOYEE: See only meetings they organized or are invited to
    // MANAGER/ADMIN: See all meetings
    const where =
      role === "EMPLOYEE"
        ? {
            OR: [
              { organizerId: userId },
              { attendees: { some: { userId: userId } } },
            ],
          }
        : {};

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({ meetings });
  } catch (error) {
    console.error("Get meetings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /meetings/invites - Get pending meeting invitations for current user
router.get("/invites", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;

    const invites = await prisma.meetingAttendee.findMany({
      where: {
        userId,
        status: "PENDING",
      },
      include: {
        meeting: {
          include: {
            organizer: {
              select: {
                id: true,
                fullName: true,
              },
            },
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        meeting: {
          startTime: "asc",
        },
      },
    });

    res.json({ invites });
  } catch (error) {
    console.error("Get invites error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /meetings - Create a new meeting
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      leadId,
      attendeeIds,
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        error: "Title, start time, and end time are required",
      });
    }

    // Filter out organizer from attendees (don't invite yourself)
    const filteredAttendeeIds = attendeeIds?.filter((id: string) => id !== userId) || [];

    // Create meeting in database
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        organizerId: userId,
        leadId: leadId || null,
        attendees: filteredAttendeeIds.length > 0
          ? {
              create: filteredAttendeeIds.map((id: string) => ({
                userId: id,
                status: "PENDING",
              })),
            }
          : undefined,
      },
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            googleRefreshToken: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Try to create Google Calendar event if organizer has connected Google
    if (meeting.organizer?.googleRefreshToken) {
      try {
        const attendeeEmails = meeting.attendees
          .map((a) => a.user.email)
          .filter(Boolean) as string[];

        const googleEventId = await createCalendarEvent(
          meeting.organizer.id,
          {
            title: meeting.title,
            description: meeting.description || undefined,
            startTime: new Date(meeting.startTime),
            endTime: new Date(meeting.endTime),
            location: meeting.location || undefined,
            attendeeEmails,
          }
        );

        if (googleEventId) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { googleEventId },
          });
        }
      } catch (calendarError) {
        console.error("Failed to create Google Calendar event:", calendarError);
        // Continue without failing - meeting is still created
      }
    }

    // Remove sensitive data from response
    const { organizer, attendees, ...meetingData } = meeting;
    const responseOrganizer = {
      id: organizer?.id || userId,
      fullName: organizer?.fullName || '',
    };
    const responseAttendees = attendees?.map((a: any) => ({
      userId: a.user.id,
      fullName: a.user.fullName,
      email: a.user.email,
      status: a.status,
    })) || [];

    res.status(201).json({
      meeting: { ...meetingData, organizer: responseOrganizer, attendees: responseAttendees },
    });
  } catch (error) {
    console.error("Create meeting error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /meetings/:id - Update a meeting
router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user!;
    const { title, description, startTime, endTime, location } = req.body;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            googleRefreshToken: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Only organizer or admin/manager can update
    if (role === "EMPLOYEE" && meeting.organizerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        location,
      },
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
            googleRefreshToken: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update Google Calendar event if it exists
    if (meeting.googleEventId && meeting.organizer?.googleRefreshToken) {
      try {
        const attendeeEmails = meeting.attendees
          .map((a) => a.user.email)
          .filter(Boolean) as string[];

        await updateCalendarEvent(
          meeting.organizerId,
          meeting.googleEventId,
          {
            title: updatedMeeting.title,
            description: updatedMeeting.description || undefined,
            startTime: new Date(updatedMeeting.startTime),
            endTime: new Date(updatedMeeting.endTime),
            location: updatedMeeting.location || undefined,
            attendeeEmails,
          }
        );
      } catch (calendarError) {
        console.error("Failed to update Google Calendar event:", calendarError);
      }
    }

    res.json({ meeting: updatedMeeting });
  } catch (error) {
    console.error("Update meeting error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /meetings/:id/invite - Invite users to a meeting
router.post("/:id/invite", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user!;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "User IDs are required" });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            googleRefreshToken: true,
          },
        },
        attendees: true,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Only organizer or admin/manager can invite
    if (role === "EMPLOYEE" && meeting.organizerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Filter out users already invited
    const existingUserIds = meeting.attendees.map((a) => a.userId);
    const newUserIds = userIds.filter(
      (uid: string) => !existingUserIds.includes(uid)
    );

    if (newUserIds.length === 0) {
      return res.status(400).json({ error: "All users are already invited" });
    }

    const meetingId = id as string;

    // Create attendee records
    await prisma.meetingAttendee.createMany({
      data: newUserIds.map((uid: string) => ({
        meetingId,
        userId: uid,
        status: "PENDING" as const,
      })),
    });

    // Fetch updated meeting with attendees
    const updatedMeeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            id: true,
            fullName: true,
            googleRefreshToken: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update Google Calendar event with new attendees
    if (meeting.googleEventId && meeting.organizer?.googleRefreshToken) {
      try {
        const attendeeEmails = updatedMeeting!.attendees
          .map((a: any) => a.user.email)
          .filter(Boolean) as string[];

        await updateCalendarEvent(
          meeting.organizerId,
          meeting.googleEventId,
          {
            title: meeting.title,
            description: meeting.description || undefined,
            startTime: new Date(meeting.startTime),
            endTime: new Date(meeting.endTime),
            location: meeting.location || undefined,
            attendeeEmails,
          }
        );
      } catch (calendarError) {
        console.error("Failed to update Google Calendar event:", calendarError);
      }
    }

    res.json({ meeting: updatedMeeting });
  } catch (error) {
    console.error("Invite to meeting error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /meetings/:id/respond - Accept or decline a meeting invitation
router.patch(
  "/:id/respond",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.user!;
      const { response } = req.body;

      if (!response || !["ACCEPTED", "DECLINED"].includes(response)) {
        return res.status(400).json({
          error: "Response must be ACCEPTED or DECLINED",
        });
      }

      // Find the attendee record
      const attendee = await prisma.meetingAttendee.findFirst({
        where: {
          meetingId: id,
          userId,
        },
        include: {
          meeting: {
            include: {
              organizer: {
                select: {
                  googleRefreshToken: true,
                },
              },
            },
          },
          user: {
            select: {
              googleRefreshToken: true,
            },
          },
        },
      });

      if (!attendee) {
        return res.status(404).json({
          error: "You are not invited to this meeting",
        });
      }

      // Update attendee status
      await prisma.meetingAttendee.update({
        where: { id: attendee.id },
        data: { status: response },
      });

      // If user has Google Calendar connected and accepted, add to their calendar
      if (response === "ACCEPTED" && attendee.user.googleRefreshToken) {
        const meeting = attendee.meeting;
        try {
          await addEventToUserCalendar(
            attendee.userId,
            {
              title: meeting.title,
              description: meeting.description || undefined,
              location: meeting.location || undefined,
              startTime: new Date(meeting.startTime),
              endTime: new Date(meeting.endTime),
            }
          );
        } catch (calendarError) {
          console.error("Failed to add event to user calendar:", calendarError);
        }
      }

      // If declined and was in their calendar, remove it
      if (response === "DECLINED" && attendee.user.googleRefreshToken) {
        const meeting = attendee.meeting;
        if (meeting.googleEventId) {
          try {
            await removeEventFromUserCalendar(
              attendee.userId,
              meeting.googleEventId
            );
          } catch (calendarError) {
            console.error(
              "Failed to remove event from user calendar:",
              calendarError
            );
          }
        }
      }

      res.json({ message: `Meeting ${response.toLowerCase()}` });
    } catch (error) {
      console.error("Respond to meeting error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /meetings/:id - Delete a meeting
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user!;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: {
          select: {
            googleRefreshToken: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                googleRefreshToken: true,
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Only organizer or admin/manager can delete
    if (role === "EMPLOYEE" && meeting.organizerId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete Google Calendar event
    if (meeting.googleEventId && meeting.organizer.googleRefreshToken) {
      try {
        await deleteCalendarEvent(
          meeting.organizerId,
          meeting.googleEventId
        );
      } catch (calendarError) {
        console.error("Failed to delete Google Calendar event:", calendarError);
      }

      // Remove from attendees' calendars
      for (const attendee of meeting.attendees) {
        if (attendee.user.googleRefreshToken) {
          try {
            await removeEventFromUserCalendar(
              attendee.userId,
              meeting.googleEventId
            );
          } catch (calendarError) {
            console.error(
              "Failed to remove event from attendee calendar:",
              calendarError
            );
          }
        }
      }
    }

    // Delete attendees first (cascade)
    await prisma.meetingAttendee.deleteMany({
      where: { meetingId: id },
    });

    await prisma.meeting.delete({ where: { id } });

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Delete meeting error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

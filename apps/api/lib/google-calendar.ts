import { google, calendar_v3 } from "googleapis";
import prisma from "@db/client";

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/auth/google/callback";

// Scopes required for google services access
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/forms.body.readonly",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

/**
 * Create an OAuth2 client
 */
export function createOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }
  
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate the authorization URL for Google OAuth
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent to get refresh token
    state: state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Get user's Google email from access token
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    return data.email || null;
  } catch (error) {
    console.error("Error getting Google user email:", error);
    return null;
  }
}

/**
 * Get an authenticated Google Calendar client for a user
 */
export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  if (!user?.googleRefreshToken) {
    return null;
  }

  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
    });

    // This will automatically refresh the access token if needed
    return google.calendar({ version: "v3", auth: oauth2Client });
  } catch (error) {
    console.error("Error creating calendar client:", error);
    return null;
  }
}

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true, googleCalendarSynced: true },
  });

  return !!(user?.googleRefreshToken && user?.googleCalendarSynced);
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  userId: string,
  eventData: {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmails?: string[];
    meetingUrl?: string;
  }
): Promise<string | null> {
  const calendar = await getCalendarClient(userId);
  
  if (!calendar) {
    console.log("Google Calendar not connected for user:", userId);
    return null;
  }

  try {
    // Build description with meeting URL if provided
    let description = eventData.description || "";
    if (eventData.meetingUrl) {
      description += `\n\nMeeting URL: ${eventData.meetingUrl}`;
    }

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title,
      description: description.trim() || undefined,
      location: eventData.location,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: "Asia/Kolkata", // You can make this configurable
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: eventData.attendeeEmails?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all", // Send email notifications to attendees
    });

    return response.data.id || null;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return null;
  }
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  userId: string,
  googleEventId: string,
  eventData: {
    title?: string;
    description?: string;
    location?: string;
    startTime?: Date;
    endTime?: Date;
    attendeeEmails?: string[];
    meetingUrl?: string;
  }
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  
  if (!calendar) {
    return false;
  }

  try {
    // First get the existing event
    const existingEvent = await calendar.events.get({
      calendarId: "primary",
      eventId: googleEventId,
    });

    // Build updated description
    let description = eventData.description ?? existingEvent.data.description ?? "";
    if (eventData.meetingUrl) {
      // Remove old meeting URL if exists and add new one
      description = description.replace(/\n\nMeeting URL:.*$/, "");
      description += `\n\nMeeting URL: ${eventData.meetingUrl}`;
    }

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title ?? existingEvent.data.summary,
      description: description.trim() || undefined,
      location: eventData.location ?? existingEvent.data.location,
      start: eventData.startTime
        ? { dateTime: eventData.startTime.toISOString(), timeZone: "Asia/Kolkata" }
        : existingEvent.data.start,
      end: eventData.endTime
        ? { dateTime: eventData.endTime.toISOString(), timeZone: "Asia/Kolkata" }
        : existingEvent.data.end,
      attendees: eventData.attendeeEmails
        ? eventData.attendeeEmails.map(email => ({ email }))
        : existingEvent.data.attendees,
    };

    await calendar.events.update({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: event,
      sendUpdates: "all",
    });

    return true;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return false;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  const calendar = await getCalendarClient(userId);
  
  if (!calendar) {
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
    });

    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    return false;
  }
}

/**
 * Add an event to a user's calendar (for attendees accepting invitations)
 */
export async function addEventToUserCalendar(
  userId: string,
  eventData: {
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    meetingUrl?: string;
    organizerEmail?: string;
  }
): Promise<string | null> {
  const calendar = await getCalendarClient(userId);
  
  if (!calendar) {
    return null;
  }

  try {
    let description = eventData.description || "";
    if (eventData.meetingUrl) {
      description += `\n\nMeeting URL: ${eventData.meetingUrl}`;
    }
    if (eventData.organizerEmail) {
      description += `\n\nOrganized by: ${eventData.organizerEmail}`;
    }

    const event: calendar_v3.Schema$Event = {
      summary: eventData.title,
      description: description.trim() || undefined,
      location: eventData.location,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 15 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data.id || null;
  } catch (error) {
    console.error("Error adding event to user calendar:", error);
    return null;
  }
}

/**
 * Remove an event from a user's calendar (for attendees declining)
 */
export async function removeEventFromUserCalendar(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  return deleteCalendarEvent(userId, googleEventId);
}

/**
 * Sync all accepted upcoming meetings to user's Google Calendar
 * Called when a user connects their Google Calendar
 */
export async function syncAcceptedMeetingsToCalendar(userId: string): Promise<number> {
  const calendar = await getCalendarClient(userId);
  
  if (!calendar) {
    return 0;
  }

  try {
    const now = new Date();
    
    // Get all accepted meeting invitations for upcoming meetings
    const acceptedMeetings = await prisma.meetingAttendee.findMany({
      where: {
        userId,
        status: "ACCEPTED",
        meeting: {
          startTime: {
            gte: now,
          },
        },
      },
      include: {
        meeting: {
          include: {
            organizer: {
              select: {
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    let syncedCount = 0;

    // Sync each accepted meeting
    for (const attendee of acceptedMeetings) {
      const meeting = attendee.meeting;
      
      try {
        // Create event in user's calendar
        const googleEventId = await addEventToUserCalendar(userId, {
          title: meeting.title,
          description: meeting.description || undefined,
          location: meeting.location || undefined,
          startTime: new Date(meeting.startTime),
          endTime: new Date(meeting.endTime),
          organizerEmail: meeting.organizer.email || undefined,
        });

        if (googleEventId) {
          syncedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync meeting ${meeting.id} to calendar:`, error);
        // Continue with other meetings
      }
    }

    return syncedCount;
  } catch (error) {
    console.error("Error syncing accepted meetings:", error);
    return 0;
  }
}

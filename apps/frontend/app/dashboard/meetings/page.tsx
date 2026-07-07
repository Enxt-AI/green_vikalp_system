"use client";

import { useEffect, useState } from "react";
import {
  meetings as meetingsApi,
  googleCalendar,
  auth,
  type Meeting,
  type MeetingInvite,
  type User,
  type GoogleCalendarStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MeetingsPage() {
  const { user: currentUser } = useAuth();
  const [meetingsList, setMeetingsList] = useState<Meeting[]>([]);
  const [invites, setInvites] = useState<MeetingInvite[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus>({
    connected: false,
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "invites">("calendar");

  // Form state for creating meetings
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    startTime: "",
    endTime: "",
    attendeeIds: [] as string[],
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
    checkGoogleStatus();

    // Check for Google OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get("google_connected");
    const googleError = params.get("google_error");

    if (googleConnected === "true") {
      toast.success("Google Calendar connected successfully!");
      checkGoogleStatus();
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (googleError) {
      toast.error(googleError);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingsData, invitesData] = await Promise.all([
        meetingsApi.list(),
        meetingsApi.getInvites(),
      ]);
      setMeetingsList(meetingsData);
      setInvites(invitesData);

      // Load users separately — this is admin-only and may return 403
      try {
        const usersData = await auth.listUsers();
        setUsers(usersData);
      } catch {
        // Non-admin users can't list users — that's fine
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleStatus = async () => {
    try {
      const status = await googleCalendar.getStatus();
      setCalendarStatus(status);
    } catch (error) {
      console.error("Failed to check Google status:", error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { authUrl } = await googleCalendar.getConnectUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to get Google auth URL:", error);
      toast.error("Failed to connect Google Calendar");
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;

    try {
      await googleCalendar.disconnect();
      setCalendarStatus({ connected: false });
      toast.success("Google Calendar disconnected");
    } catch (error) {
      console.error("Failed to disconnect Google:", error);
      toast.error("Failed to disconnect Google Calendar");
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;

    try {
      await meetingsApi.delete(id);
      toast.success("Meeting deleted successfully");
      loadData();
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      toast.error("Failed to delete meeting");
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setCreating(true);
      await meetingsApi.create({
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        attendeeIds: formData.attendeeIds,
      });
      toast.success("Meeting created successfully");
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
        attendeeIds: [],
      });
      loadData();
    } catch (error) {
      console.error("Failed to create meeting:", error);
      toast.error("Failed to create meeting");
    } finally {
      setCreating(false);
    }
  };

  const handleRespondToInvite = async (
    meetingId: string,
    response: "ACCEPTED" | "DECLINED"
  ) => {
    try {
      await meetingsApi.respond(meetingId, response);
      toast.success(`Meeting ${response.toLowerCase()}`);
      loadData();
    } catch (error) {
      console.error("Failed to respond to invite:", error);
      toast.error("Failed to respond to invitation");
    }
  };

  const toggleAttendee = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(userId)
        ? prev.attendeeIds.filter((id) => id !== userId)
        : [...prev.attendeeIds, userId],
    }));
  };

  // Get upcoming meetings (next 3)
  const now = new Date();
  const upcomingMeetings = meetingsList
    .filter(
      (meeting) =>
        new Date(meeting.startTime) > now && meeting.status === "SCHEDULED"
    )
    .slice(0, 3);

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const monthDays = lastDay.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getMeetingsForDay = (day: number) => {
    const dayDate = new Date(year, month, day);
    dayDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return meetingsList.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate >= dayDate && meetingDate < nextDay;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFullDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-sm text-gray-600">
            View and manage your scheduled meetings
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>+ New Meeting</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Meeting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Meeting title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Meeting description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Meeting location or link"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Invite Attendees</Label>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {users && users.length > 0 ? (
                    users
                      .filter((u) => u.isActive && u.id !== currentUser?.id)
                      .map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.attendeeIds.includes(user.id)}
                            onChange={() => toggleAttendee(user.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{user.fullName}</span>
                          <span className="text-xs text-gray-500">
                            ({user.role})
                          </span>
                        </label>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500 p-2">Loading users...</p>
                  )}
                </div>
                {formData.attendeeIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.attendeeIds.length} attendee(s) selected
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Meeting"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Google Calendar Banner */}
      <Card
        className={
          calendarStatus.connected
            ? "bg-green-50 border-green-200"
            : "bg-blue-50 border-blue-200"
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                {calendarStatus.connected ? (
                  <>
                    <p className="font-medium text-green-800">
                      Google Calendar Connected
                    </p>
                    <p className="text-sm text-green-600">
                      Synced with {calendarStatus.email}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-blue-800">
                      Connect Google Calendar
                    </p>
                    <p className="text-sm text-blue-600">
                      Sync meetings with your Google Calendar
                    </p>
                  </>
                )}
              </div>
            </div>
            {calendarStatus.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectGoogle}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectGoogle}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 -mb-px ${activeTab === "calendar"
              ? "border-b-2 border-blue-600 font-medium text-blue-600"
              : "text-gray-600 hover:text-gray-900"
            }`}
          onClick={() => setActiveTab("calendar")}
        >
          Calendar
        </button>
        <button
          className={`px-4 py-2 -mb-px flex items-center gap-2 ${activeTab === "invites"
              ? "border-b-2 border-blue-600 font-medium text-blue-600"
              : "text-gray-600 hover:text-gray-900"
            }`}
          onClick={() => setActiveTab("invites")}
        >
          Invitations
          {invites.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {invites.length}
            </Badge>
          )}
        </button>
      </div>

      {activeTab === "invites" ? (
        /* Invitations Tab */
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length > 0 ? (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{invite.meeting.title}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        📅 {formatFullDateTime(invite.meeting.startTime)}
                      </div>
                      {invite.meeting.location && (
                        <div className="text-sm text-gray-600">
                          📍 {invite.meeting.location}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        From: {invite.meeting.organizer.fullName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRespondToInvite(invite.meetingId, "ACCEPTED")
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRespondToInvite(invite.meetingId, "DECLINED")
                        }
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>No pending invitations</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Calendar View */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {monthNames[month]} {year}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    ← Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    Next →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-sm p-2 bg-gray-50"
                  >
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-24 p-1 border" />
                ))}

                {/* Calendar days */}
                {Array.from({ length: monthDays }).map((_, i) => {
                  const day = i + 1;
                  const dayMeetings = getMeetingsForDay(day);
                  const isToday =
                    new Date().toDateString() ===
                    new Date(year, month, day).toDateString();

                  return (
                    <div
                      key={day}
                      className={`min-h-24 p-1 border ${isToday ? "bg-blue-50 border-blue-300" : ""
                        }`}
                    >
                      <div
                        className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : ""
                          }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200"
                            title={`${meeting.title} - ${formatTime(meeting.startTime)}`}
                          >
                            <div className="font-medium truncate">
                              {meeting.title}
                            </div>
                            <div className="text-xs">
                              {formatTime(meeting.startTime)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card>
            <CardHeader>
              <CardTitle>Next 3 Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {meeting.title}
                          </h3>
                          {meeting.status !== "SCHEDULED" && (
                            <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                              {meeting.status}
                            </span>
                          )}
                          {meeting.googleEventId && (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 border-green-300"
                              title="Synced to organizer's Google Calendar"
                            >
                              📅 Synced
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          📅 {formatFullDateTime(meeting.startTime)}
                        </div>
                        {meeting.lead && (
                          <div className="text-sm text-gray-600 mt-1">
                            🎯 {meeting.lead.firstName} {meeting.lead.lastName}
                          </div>
                        )}
                        {meeting.location && (
                          <div className="text-sm text-gray-600 mt-1">
                            📍 {meeting.location}
                          </div>
                        )}
                        {meeting.meetingUrl && (
                          <div className="text-sm text-blue-600 mt-1">
                            <a
                              href={meeting.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              🔗 Join Meeting
                            </a>
                          </div>
                        )}
                        {/* Attendees */}
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              Attendees:{" "}
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {meeting.attendees.map((att) => (
                                <Badge
                                  key={att.id}
                                  variant={
                                    att.status === "ACCEPTED"
                                      ? "default"
                                      : att.status === "DECLINED"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {att.user.fullName}
                                  {att.status === "ACCEPTED" && " ✓"}
                                  {att.status === "DECLINED" && " ✗"}
                                  {att.status === "PENDING" && " ?"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Organizer: {meeting.organizer.fullName}
                        </div>
                      </div>

                      {(currentUser?.id === meeting.organizerId ||
                        currentUser?.role === "ADMIN" ||
                        currentUser?.role === "MANAGER") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            🗑️
                          </Button>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📅</div>
                  <p>No upcoming meetings scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

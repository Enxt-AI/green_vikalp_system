"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { leads as leadsApi, campaigns as campaignsApi, properties as propertiesApi, tasks as tasksApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [totalLeads, setTotalLeads] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [activeProperties, setActiveProperties] = useState(0);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  useEffect(() => {
    // Fetch real estate stats
    leadsApi.list().then((data) => setTotalLeads(data.length)).catch(console.error);
    campaignsApi.list().then((data) => {
      const active = data.filter((c) => c.status === "ACTIVE").length;
      setActiveCampaigns(active);
    }).catch(console.error);
    propertiesApi.list().then((data) => {
      setTotalProperties(data.length);
      const active = data.filter((p: any) => p.listingStatus === "ACTIVE").length;
      setActiveProperties(active);
    }).catch(console.error);
  }, []);

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !taskDueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsCreatingTask(true);
      await tasksApi.create({
        title: taskTitle,
        dueDate: new Date(taskDueDate).toISOString(),
        priority: taskPriority,
      });
      toast.success("Task created successfully!");
      setShowTaskDialog(false);
      setTaskTitle("");
      setTaskDueDate("");
      setTaskPriority("MEDIUM");
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-green-800 p-8 text-white shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-white/20 text-white bg-white/10">
              {user?.role}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">
            {greeting}, {user?.fullName?.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 text-neutral-300 max-w-2xl">
            Track your leads, manage campaigns, and be more productive
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">
                Total Leads
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{totalLeads}</div>
            <p className="mt-1 text-sm text-blue-700">Active prospects</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-900">
                Active Campaigns
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{activeCampaigns}</div>
            <p className="mt-1 text-sm text-green-700">Running campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-900">
                Properties Listed
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{totalProperties}</div>
            <p className="mt-1 text-sm text-purple-700">{activeProperties} active listings</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-white hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-900">
                Tours Scheduled
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">—</div>
            <p className="mt-1 text-sm text-orange-700">Property viewings</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push("/dashboard/leads?openDialog=true")}
              className="group flex w-full items-center gap-4 rounded-xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900">Add New Lead</p>
                <p className="text-sm text-neutral-500">Create and track potential customers</p>
              </div>
              <svg className="h-5 w-5 text-neutral-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
              <DialogTrigger asChild>
                <button className="group flex w-full items-center gap-4 rounded-xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-green-200 hover:bg-green-50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Create Task</p>
                    <p className="text-sm text-neutral-500">Set reminders and deadlines</p>
                  </div>
                  <svg className="h-5 w-5 text-neutral-400 group-hover:text-green-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Enter task title"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={taskPriority} onValueChange={(v: any) => setTaskPriority(v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateTask}
                    className="w-full"
                    disabled={isCreatingTask}
                  >
                    {isCreatingTask ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <button
              onClick={() => router.push("/dashboard/meetings")}
              className="group flex w-full items-center gap-4 rounded-xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-purple-200 hover:bg-purple-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900">Schedule Meeting</p>
                <p className="text-sm text-neutral-500">Book time with leads and prospects</p>
              </div>
              <svg className="h-5 w-5 text-neutral-400 group-hover:text-purple-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </CardContent>
        </Card>

        {/* Navigation Shortcuts */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Navigate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/dashboard/leads")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-neutral-100 p-4 transition-all hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-700">Leads</span>
              </button>

              <button
                onClick={() => router.push("/dashboard/campaigns")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-neutral-100 p-4 transition-all hover:border-green-200 hover:bg-green-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-700">Campaigns</span>
              </button>

              <button
                onClick={() => router.push("/dashboard/properties")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-neutral-100 p-4 transition-all hover:border-purple-200 hover:bg-purple-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-700">Properties</span>
              </button>

              <button
                onClick={() => router.push("/dashboard/tasks")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-neutral-100 p-4 transition-all hover:border-orange-200 hover:bg-orange-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-neutral-700">Tasks</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


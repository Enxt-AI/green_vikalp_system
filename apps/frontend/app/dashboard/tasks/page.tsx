"use client";

import { useEffect, useState } from "react";
import { tasks, leads as leadsApi, type Task, type Lead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TasksPage() {
  const { user } = useAuth();
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ dueToday: 0, upcoming: 0, expired: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [leadId, setLeadId] = useState("");

  useEffect(() => {
    loadData();
    loadLeads();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, followUpsData] = await Promise.all([
        tasks.list(),
        tasks.followUps.list()
      ]);
      
      const mappedFollowUps = followUpsData.map((lead: any) => ({
        id: `followup-${lead.id}`,
        title: `Follow up with ${lead.firstName} ${lead.lastName}`,
        description: `Stage: ${lead.currentStage?.name || 'Unknown'}`,
        dueDate: lead.nextFollowUpAt,
        priority: lead.priority || "MEDIUM",
        isCompleted: false,
        lead: { firstName: lead.firstName, lastName: lead.lastName },
        isFollowUp: true,
        leadId: lead.id
      })) as any[];
      
      const allTasks = [...tasksData, ...mappedFollowUps];
      setTaskList(allTasks);
      
      // Calculate stats from task list
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const calculatedStats = {
        dueToday: allTasks.filter((t) => {
          const d = new Date(t.dueDate);
          d.setHours(0, 0, 0, 0);
          return !t.isCompleted && d.getTime() === today.getTime();
        }).length,
        upcoming: allTasks.filter((t) => {
          const d = new Date(t.dueDate);
          d.setHours(0, 0, 0, 0);
          return !t.isCompleted && d.getTime() > today.getTime();
        }).length,
        expired: allTasks.filter((t) => {
          const d = new Date(t.dueDate);
          d.setHours(0, 0, 0, 0);
          return !t.isCompleted && d.getTime() < today.getTime();
        }).length,
        completed: allTasks.filter((t) => t.isCompleted).length,
      };
      setStats(calculatedStats);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const data = await leadsApi.list();
      setLeadsList(data);
    } catch (error) {
      console.error("Failed to load leads:", error);
    }
  };

  const handleAddTask = async () => {
    if (!title.trim() || !dueDate) {
      toast.error("Please fill in title and due date");
      return;
    }

    try {
      await tasks.create({
        title,
        description: description || undefined,
        dueDate: new Date(dueDate).toISOString(),
        priority,
        leadId: leadId || undefined,
      });
      toast.success("Task created successfully");
      setShowAddTask(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("MEDIUM");
      setLeadId("");
      loadData();
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      if (taskId.startsWith("followup-")) {
        const leadId = taskId.replace("followup-", "");
        await tasks.followUps.clear(leadId);
      } else {
        await tasks.toggleComplete(taskId);
      }
      loadData();
    } catch (error) {
      console.error("Failed to toggle task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      if (taskId.startsWith("followup-")) {
        const leadId = taskId.replace("followup-", "");
        await tasks.followUps.clear(leadId);
      } else {
        await tasks.delete(taskId);
      }
      toast.success("Task deleted successfully");
      loadData();
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  // Filter tasks by status
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueTodayTasks = taskList.filter((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    return !task.isCompleted && taskDate.getTime() === today.getTime();
  });

  const upcomingTasks = taskList.filter((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    return !task.isCompleted && taskDate.getTime() > today.getTime();
  });

  const expiredTasks = taskList.filter((task) => {
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);
    return !task.isCompleted && taskDate.getTime() < today.getTime();
  });

  const completedTasks = taskList.filter((task) => task.isCompleted);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div className="flex items-start justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 flex-1">
        <button
          onClick={() => handleToggleComplete(task.id)}
          className={`mt-1 flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
            task.isCompleted
              ? "border-green-500 bg-green-500"
              : "border-neutral-300 hover:border-green-500"
          }`}
        >
          {task.isCompleted && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1">
          <h3 className={`font-medium ${task.isCompleted ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-sm text-neutral-500">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-neutral-500">Due: {formatDate(task.dueDate)}</span>
            <Badge className={getPriorityStyle(task.priority)}>
              {task.priority}
            </Badge>
            {task.lead && (
              <Badge variant="outline" className="text-xs">
                {task.lead.firstName} {task.lead.lastName}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => handleDeleteTask(task.id)}
        className="ml-2 text-neutral-400 hover:text-red-600 transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  const getPriorityStyle = (priority: string) => {
    const styles = {
      LOW: "bg-neutral-100 text-neutral-600 border-0",
      MEDIUM: "bg-blue-100 text-blue-700 border-0",
      HIGH: "bg-orange-100 text-orange-700 border-0",
      URGENT: "bg-red-100 text-red-700 border-0",
    };
    return styles[priority as keyof typeof styles] || styles.MEDIUM;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Tasks</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your tasks and to-dos
          </p>
        </div>
        <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
          <DialogTrigger asChild>
            <Button>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about this task..."
                  className="mt-1.5 resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
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
              </div>
              <div>
                <Label htmlFor="lead">Related Lead (Optional)</Label>
                <Select value={leadId || undefined} onValueChange={setLeadId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadsList.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddTask} className="w-full">
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900">{stats.dueToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue Tasks */}
          {expiredTasks.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-red-700">
                  Overdue ({expiredTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expiredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Due Today */}
          {dueTodayTasks.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-blue-700">
                  Due Today ({dueTodayTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dueTodayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Tasks */}
          {upcomingTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Upcoming ({upcomingTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium text-neutral-500">
                  Completed ({completedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {taskList.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-neutral-900">No tasks yet</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Get started by creating your first task
                  </p>
                  <div className="mt-4">
                    <Button onClick={() => setShowAddTask(true)}>Add Task</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

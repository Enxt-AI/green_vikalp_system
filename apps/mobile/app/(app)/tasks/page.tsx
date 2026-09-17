"use client";

import { MobileHeader } from "@/components/mobile/header";
import { tasks as tasksApi, type Task } from "@/lib/api";
import { CACHE_TTLS, invalidateCache, useCachedFetch } from "@/lib/cached-fetch";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { ClipboardList, CheckCircle2, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function TasksPage() {
  const { data: tasksData, loading: isLoading, setData } = useCachedFetch<Task[]>(
    "tasks:all",
    () => tasksApi.list(),
    { ttl: CACHE_TTLS.realtime }
  );
  const tasks = tasksData ?? [];
  const setTasks = (
    updater: Task[] | ((prev: Task[] | null) => Task[] | null)
  ) => {
    if (typeof updater === "function") {
      const next = updater(tasksData);
      if (next) setData(next);
    } else {
      setData(updater);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      // Optimistic update
      setTasks(prev => (prev ?? []).map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));

      await tasksApi.toggleComplete(task.id);
      invalidateCache("tasks:");

      toast.success(task.isCompleted ? "Task uncompleted" : "Task completed");
    } catch (error) {
      // Revert on failure
      setTasks(prev => (prev ?? []).map(t => t.id === task.id ? { ...t, isCompleted: task.isCompleted } : t));
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT": return "text-red-600 bg-red-100";
      case "HIGH": return "text-orange-600 bg-orange-100";
      case "MEDIUM": return "text-blue-600 bg-blue-100";
      case "LOW": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="My Tasks" />

      {isLoading ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[80px]">
          <CardListSkeleton count={5} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-brand-100 p-6 shadow-inner">
            <ClipboardList className="h-16 w-16 text-brand-600" strokeWidth={2.5} />
          </div>
          <p className="text-lg text-brand-900">No tasks found.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[80px]">
          {tasks.map((task) => (
            <div 
              key={task.id}
              onClick={() => toggleTask(task)}
              className={`bg-white rounded-xl shadow-sm border border-brand-100 p-4 flex gap-4 transition-colors active:bg-brand-50 ${task.isCompleted ? 'opacity-75' : ''}`}
            >
              <div className="pt-1">
                <CheckCircle2 className={`h-6 w-6 ${task.isCompleted ? 'text-green-500 fill-green-50' : 'text-brand-200'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-base mb-2 ${task.isCompleted ? 'text-gray-500 line-through' : 'text-brand-950'}`}>
                  {task.title}
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-brand-500">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth, ApiError, tasks as tasksApi, meetings as meetingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SigninPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
      return;
    }
    checkSetup();
  }, [authLoading, isAuthenticated, router]);

  async function checkSetup() {
    try {
      const { setupRequired } = await auth.checkSetup();
      if (setupRequired) {
        router.replace("/setup");
      } else {
        setIsCheckingSetup(false);
      }
    } catch {
      toast.error("Failed to check setup status");
      setIsCheckingSetup(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Use login from AuthContext to update global auth state
      await login(formData.username, formData.password);
      toast.success("Signed in successfully!");

      // Fetch and show today's tasks and follow-ups
      showTodayReminders();

      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to sign in");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function showTodayReminders() {
    try {
      const [tasksData, followUpsData, meetingsData] = await Promise.all([
        tasksApi.list(),
        tasksApi.followUps.list(),
        meetingsApi.list(),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter today's tasks
      const todayTasks = tasksData.filter((task) => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return !task.isCompleted && taskDate.getTime() === today.getTime();
      });

      // Filter today's follow-ups
      const todayFollowUps = followUpsData.filter((followUp: any) => {
        const followUpDate = new Date(followUp.nextFollowUpAt);
        followUpDate.setHours(0, 0, 0, 0);
        return followUpDate.getTime() === today.getTime();
      });

      // Filter today's meetings
      const todayMeetings = meetingsData.filter((meeting) => {
        const meetingDate = new Date(meeting.startTime);
        meetingDate.setHours(0, 0, 0, 0);
        return meeting.status === "SCHEDULED" && meetingDate.getTime() === today.getTime();
      });

      // Combine all reminders into a single message to avoid flickering
      const reminders: string[] = [];

      if (todayTasks.length > 0) {
        reminders.push(`📋 ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due`);
      }

      if (todayFollowUps.length > 0) {
        reminders.push(`📞 ${todayFollowUps.length} follow-up${todayFollowUps.length > 1 ? 's' : ''}`);
      }

      if (todayMeetings.length > 0) {
        reminders.push(`📅 ${todayMeetings.length} meeting${todayMeetings.length > 1 ? 's' : ''}`);
      }

      // Show single combined notification if there are any reminders
      if (reminders.length > 0) {
        toast.info(`Today: ${reminders.join(" • ")}`, {
          duration: 6000,
        });
      }
    } catch (error) {
      // Silently fail - don't disrupt login flow
      console.error("Failed to fetch reminders:", error);
    }
  }

  if (isCheckingSetup || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-semibold text-white">Green Vikalp</span>
          </div>
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-lg text-white/80">
              &ldquo;Streamline your customer relationships with powerful tools
              designed for modern teams.&rdquo;
            </p>
          </blockquote>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-sm text-white/60">Built for growth</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-white">500+</div>
              <div className="text-xs text-white/60">Active Users</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">10k+</div>
              <div className="text-xs text-white/60">Leads Managed</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-white">99.9%</div>
              <div className="text-xs text-white/60">Uptime</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Green Vikalp Systems. All rights reserved.
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full items-center justify-center bg-brand-50 p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <Image
              src="/logo.webp"
              alt="Logo"
              width={48}
              height={48}
              className="mx-auto mb-4 rounded-lg"
            />
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Green Vikalp Systems
            </h1>
          </div>

          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-medium">Welcome back</CardTitle>
              <CardDescription className="text-sm text-neutral-500">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-neutral-700">
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    className={errors.username ? "border-red-500 focus-visible:ring-red-500" : ""}
                    disabled={isSubmitting}
                    autoComplete="username"
                  />
                  {errors.username && (
                    <p className="text-xs text-red-500">{errors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                      Password
                    </Label>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-neutral-500">
            Having trouble signing in?{" "}
            <Link href="#" className="text-neutral-900 hover:underline">
              Contact your administrator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


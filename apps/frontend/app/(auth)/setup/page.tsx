"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { auth, ApiError } from "@/lib/api";
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

export default function SetupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkSetup();
  }, []);

  async function checkSetup() {
    try {
      const { setupRequired } = await auth.checkSetup();
      if (!setupRequired) {
        router.replace("/signin");
      } else {
        setIsLoading(false);
      }
    } catch {
      toast.error("Failed to check setup status");
      setIsLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await auth.setup({
        fullName: formData.fullName,
        username: formData.username,
        password: formData.password,
      });
      // Refresh auth context to update global state
      await refreshUser();
      toast.success("Admin account created successfully!");
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, messages] of Object.entries(error.details)) {
            fieldErrors[key] = messages[0];
          }
          setErrors(fieldErrors);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Failed to create admin account");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.webp"
            alt="Logo"
            width={48}
            height={48}
            className="mx-auto mb-4 rounded-lg"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-brand-900">
            Welcome to Green Vikalp
          </h1>
          <p className="mt-1 text-sm text-brand-600">
            Set up your admin account to get started
          </p>
        </div>

        <Card className="border-brand-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium">Create Admin Account</CardTitle>
            <CardDescription className="text-sm text-brand-500">
              This account will have full access to manage your CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-neutral-700">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.fullName && (
                  <p className="text-xs text-red-500">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-neutral-700">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword}</p>
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
                    Creating...
                  </span>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-neutral-500">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}


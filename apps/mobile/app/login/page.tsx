"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/home");
    }
  }, [authLoading, isAuthenticated, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData.username, formData.password);
      toast.success("Signed in successfully!");
      router.push("/home");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-50 pt-safe pb-safe">
      <div className="flex-1 flex flex-col justify-center px-6">
        {/* Logo/Branding Header */}
        <div className="mb-10 text-center">
          <Image
            src="/logo.webp"
            alt="Logo"
            width={80}
            height={80}
            className="mx-auto mb-4 rounded-2xl w-auto h-auto"
          />
          <h1 className="text-3xl font-bold tracking-tight text-brand-800">
            Green Vikalp
          </h1>
          <p className="mt-2 text-sm text-brand-600">
            Welcome back, please login
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-brand-100 border border-brand-100">
          <h2 className="mb-6 text-2xl font-semibold text-brand-950">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                name="username"
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting}
                className="h-14 rounded-xl border-brand-200 bg-brand-50 px-4 text-base focus-visible:ring-brand-500"
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            <div>
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                className="h-14 rounded-xl border-brand-200 bg-brand-50 px-4 text-base focus-visible:ring-brand-500"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-lg font-semibold text-white shadow-lg shadow-brand-500/30 hover:from-brand-700 hover:to-brand-800"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-300 border-t-white" />
                  Logging in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

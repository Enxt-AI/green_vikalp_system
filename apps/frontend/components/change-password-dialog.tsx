"use client";

import { useState } from "react";
import { toast } from "sonner";
import { auth, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstLogin?: boolean;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  isFirstLogin = false,
}: ChangePasswordDialogProps) {
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one lowercase letter";
    } else if (!/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = "Password must contain at least one number";
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await auth.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      toast.success("Password changed successfully!");
      await refreshUser();
      onOpenChange(false);
      resetForm();
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
        toast.error("Failed to change password");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDismiss() {
    if (!isFirstLogin) {
      onOpenChange(false);
      return;
    }

    try {
      await auth.dismissPasswordChange();
      await refreshUser();
      onOpenChange(false);
    } catch {
      toast.error("Failed to dismiss");
    }
  }

  function resetForm() {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">
            {isFirstLogin ? "Update Your Password" : "Change Password"}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            {isFirstLogin
              ? "For security, we recommend changing your temporary password."
              : "Enter your current password and choose a new one."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium text-neutral-700">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              placeholder="••••••••"
              value={formData.currentPassword}
              onChange={handleChange}
              className={errors.currentPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.currentPassword && (
              <p className="text-xs text-red-500">{errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-neutral-700">
              New Password
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="••••••••"
              value={formData.newPassword}
              onChange={handleChange}
              className={errors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.newPassword && (
              <p className="text-xs text-red-500">{errors.newPassword}</p>
            )}
            <p className="text-xs text-neutral-500">
              Min 8 characters, with uppercase, lowercase, and number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
              Confirm New Password
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

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {isFirstLogin && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Skip for now
              </Button>
            )}
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
                  Changing...
                </span>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


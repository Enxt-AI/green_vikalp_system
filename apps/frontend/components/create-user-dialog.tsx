"use client";

import { useState } from "react";
import { toast } from "sonner";
import { auth, ApiError } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onUserCreated,
}: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"generate" | "manual">("generate");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    contactNumber: "",
    employeeId: "",
    role: "" as "MANAGER" | "TEAM_LEADER" | "TELE_CALLER" | "FIELD_EXECUTIVE" | "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function handleRoleChange(value: "MANAGER" | "TEAM_LEADER" | "TELE_CALLER" | "FIELD_EXECUTIVE") {
    setFormData((prev) => ({ ...prev, role: value }));
    setErrors((prev) => ({ ...prev, role: "" }));
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

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (passwordMode === "manual") {
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await auth.createUser({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email || undefined,
        contactNumber: formData.contactNumber || undefined,
        employeeId: formData.employeeId || undefined,
        role: formData.role as "MANAGER" | "TEAM_LEADER" | "TELE_CALLER" | "FIELD_EXECUTIVE",
        password: passwordMode === "manual" ? formData.password : undefined,
      });

      setCreatedPassword(response.temporaryPassword);
      toast.success("User created successfully!");
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
        toast.error("Failed to create user");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (createdPassword) {
      onUserCreated();
    }
    onOpenChange(false);
    resetForm();
  }

  function resetForm() {
    setFormData({
      fullName: "",
      username: "",
      email: "",
      contactNumber: "",
      employeeId: "",
      role: "",
      password: "",
    });
    setErrors({});
    setPasswordMode("generate");
    setCreatedPassword(null);
  }

  function copyPassword() {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      toast.success("Password copied to clipboard!");
    }
  }

  // Show success state with password
  if (createdPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">User Created Successfully</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Share these credentials with the new user. They will be prompted to change their password on first login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-neutral-50 p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-neutral-500">Username</p>
                  <p className="font-mono text-sm text-neutral-900">{formData.username}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Email</p>
                  <p className="text-sm text-neutral-900">{formData.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Contact Number</p>
                  <p className="text-sm text-neutral-900">{formData.contactNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Employee ID</p>
                  <p className="text-sm text-neutral-900">{formData.employeeId || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Temporary Password</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-neutral-900">{createdPassword}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyPassword}
                      className="h-6 px-2"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500">Role</p>
                  <p className="text-sm text-neutral-900">{formData.role}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-amber-800">
                  Make sure to save or share this password now. It won&apos;t be shown again.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full bg-gre-900 hover:bg-neutral-800">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Create New User</DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            Add a new team member to your CRM
          </DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber" className="text-sm font-medium text-neutral-700">
              Contact Number
            </Label>
            <Input
              id="contactNumber"
              name="contactNumber"
              type="text"
              placeholder="+1 234 567 890"
              value={formData.contactNumber}
              onChange={handleChange}
              className={errors.contactNumber ? "border-red-500 focus-visible:ring-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.contactNumber && (
              <p className="text-xs text-red-500">{errors.contactNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId" className="text-sm font-medium text-neutral-700">
              Employee ID
            </Label>
            <Input
              id="employeeId"
              name="employeeId"
              type="text"
              placeholder="EMP-123"
              value={formData.employeeId}
              onChange={handleChange}
              className={errors.employeeId ? "border-red-500 focus-visible:ring-red-500" : ""}
              disabled={isSubmitting}
            />
            {errors.employeeId && (
              <p className="text-xs text-red-500">{errors.employeeId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium text-neutral-700">
              Role
            </Label>
            <Select
              value={formData.role}
              onValueChange={handleRoleChange}
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.role ? "border-red-500 focus:ring-red-500" : ""}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                <SelectItem value="TELE_CALLER">Tele Callers</SelectItem>
                <SelectItem value="FIELD_EXECUTIVE">Field Executive</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-red-500">{errors.role}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-neutral-700">Password</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={passwordMode === "generate" ? "default" : "outline"}
                size="sm"
                onClick={() => setPasswordMode("generate")}
                disabled={isSubmitting}
                className={passwordMode === "generate" ? "bg-neutral-900 hover:bg-neutral-800" : ""}
              >
                Generate Random
              </Button>
              <Button
                type="button"
                variant={passwordMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setPasswordMode("manual")}
                disabled={isSubmitting}
                className={passwordMode === "manual" ? "bg-neutral-900 hover:bg-neutral-800" : ""}
              >
                Set Manually
              </Button>
            </div>

            {passwordMode === "manual" && (
              <div className="space-y-2">
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
                <p className="text-xs text-neutral-500">
                  Min 8 characters, with uppercase, lowercase, and number
                </p>
              </div>
            )}

            {passwordMode === "generate" && (
              <p className="text-xs text-neutral-500">
                A secure random password will be generated and shown after creation
              </p>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
                  Creating...
                </span>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


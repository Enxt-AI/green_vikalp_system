"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { auth, type User, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "@/components/create-user-dialog";
import { UserStatsDialog } from "@/components/user-stats-dialog";

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    fetchUsers();
  }, [currentUser, router]);

  async function fetchUsers() {
    try {
      const users = await auth.listUsers();
      setUsers(users);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        router.replace("/dashboard");
      } else {
        toast.error("Failed to fetch users");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive(userId: string) {
    try {
      const { user: updatedUser, message } = await auth.toggleUserActive(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );
      toast.success(message);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update user status");
      }
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case "ADMIN":
        return "default";
      case "MANAGER":
        return "secondary";
      default:
        return "outline";
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-neutral-800">User Report</h1>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-brand-600 border-brand-200 bg-brand-50/50 hover:bg-brand-50 h-9 px-4 rounded-md font-medium text-sm">
            Last 30 Days ✕
          </Button>
          <Button variant="outline" className="text-neutral-600 border-neutral-200 hover:bg-neutral-50 h-9 px-4 rounded-md font-medium text-sm gap-2">
            Role 
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </Button>
          <Button variant="outline" className="text-neutral-600 border-neutral-200 hover:bg-neutral-50 h-9 px-4 rounded-md font-medium text-sm gap-2">
            User
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </Button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            variant="outline" 
            className="text-neutral-600 border-neutral-200 hover:bg-neutral-50 h-9 px-4 rounded-md font-medium text-sm gap-2"
          >
            + Add User
          </Button>
        </div>
        
        <Button variant="outline" size="icon" className="h-9 w-9 border-neutral-200 text-neutral-500 hover:text-neutral-700 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
        </Button>
      </div>

      {/* Users table */}
      <div className="border border-neutral-100 rounded-lg overflow-hidden bg-white">
        {users.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-neutral-500">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-50/50">
                <TableRow className="hover:bg-transparent border-neutral-100">
                  <TableHead className="w-16 font-medium text-neutral-400">No.</TableHead>
                  <TableHead className="font-medium text-neutral-400">User Name</TableHead>
                  <TableHead className="font-medium text-neutral-400">Role</TableHead>
                  <TableHead className="font-medium text-neutral-400">Status</TableHead>
                  <TableHead className="font-medium text-neutral-400">Total Calls</TableHead>
                  <TableHead className="font-medium text-neutral-400">Connected</TableHead>
                  <TableHead className="font-medium text-neutral-400">Unconnected</TableHead>
                  <TableHead className="font-medium text-neutral-400">Last Login</TableHead>
                  <TableHead className="font-medium text-neutral-400">Created</TableHead>
                  <TableHead className="text-right font-medium text-neutral-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow 
                    key={user.id} 
                    className="cursor-pointer hover:bg-neutral-50 transition-colors border-neutral-100"
                    onClick={() => setSelectedUser(user)}
                  >
                    <TableCell className="text-sm text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-neutral-700">{user.fullName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="font-normal text-xs">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isActive ? "bg-green-500" : "bg-neutral-300"
                          }`}
                        />
                        <span className="text-sm text-neutral-600">
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {user.stats?.totalCalls || 0}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {user.stats?.connectedCalls || 0}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {user.stats?.unconnectedCalls || 0}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {formatDate(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {user.id !== currentUser?.id && user.role !== "ADMIN" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id)}
                          className="text-neutral-500 hover:text-neutral-800 text-xs h-8"
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-neutral-400">You</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create user dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={fetchUsers}
      />

      {/* User Stats Dialog */}
      <UserStatsDialog 
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </div>
  );
}


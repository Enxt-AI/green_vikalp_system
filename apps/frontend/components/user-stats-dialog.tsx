import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type User } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneIncoming, PhoneOff } from "lucide-react";

interface UserStatsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserStatsDialog({ user, open, onOpenChange }: UserStatsDialogProps) {
  if (!user) return null;

  const totalCalls = user.stats?.totalCalls || 0;
  const connectedCalls = user.stats?.connectedCalls || 0;
  const unconnectedCalls = user.stats?.unconnectedCalls || 0;

  // Calculate percentages safely
  const connectedPercentage = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  const unconnectedPercentage = totalCalls > 0 ? Math.round((unconnectedCalls / totalCalls) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-900">
            {user.fullName}'s Statistics
          </DialogTitle>
          <p className="text-sm text-neutral-500">@{user.username} • {user.role.replace("_", " ")}</p>
        </DialogHeader>

        <div className="grid gap-4 py-4 md:grid-cols-3">
          <Card className="bg-neutral-50 border-neutral-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-neutral-600">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900">{totalCalls}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-green-700">Connected</CardTitle>
              <PhoneIncoming className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{connectedCalls}</div>
              <p className="text-xs text-green-600/80 mt-1">{connectedPercentage}% connect rate</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-red-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-red-700">Unconnected</CardTitle>
              <PhoneOff className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{unconnectedCalls}</div>
              <p className="text-xs text-red-600/80 mt-1">{unconnectedPercentage}% miss rate</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

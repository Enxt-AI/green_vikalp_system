"use client";

import { MobileHeader } from "@/components/mobile/header";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="Notifications" />

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full bg-brand-100 p-6 shadow-inner">
          <Bell className="h-16 w-16 text-brand-600" strokeWidth={2.5} />
        </div>
        <p className="text-lg text-brand-900">No notifications found.</p>
        <p className="text-sm text-brand-500 mt-2">You will be notified here for important updates.</p>
      </div>
    </div>
  );
}

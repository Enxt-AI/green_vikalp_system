"use client";

import { useAuth } from "@/lib/auth-context";
import {
  Megaphone,
  PhoneCall,
  ClipboardList,
  BarChart2,
  History,
  UserPlus,
  Bell,
  Filter,
  Plus
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user } = useAuth();

  const gridItems = [
    {
      title: "My Campaigns",
      icon: Megaphone,
      href: "/campaigns",
    },
    {
      title: "My Leads",
      icon: PhoneCall,
      href: "/leads",
    },
    {
      title: "My Tasks",
      icon: ClipboardList,
      href: "/tasks",
    },
    {
      title: "My Report",
      icon: BarChart2,
      href: "/reports",
    },
    {
      title: "Call Logs",
      icon: History,
      href: "/call-logs",
    },
    {
      title: "Walk-in Leads",
      icon: UserPlus,
      href: "/walk-in",
    },
  ];

  return (
    <div className="min-h-full bg-neutral-50/50">
      {/* Header */}
      <header className="bg-white px-4 pt-safe border-b border-neutral-200 sticky top-0 z-10">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg"
            />
            <span className="text-lg font-medium tracking-tight text-neutral-900">Green Vikalp</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tasks" className="relative rounded-full p-2 hover:bg-neutral-100 text-neutral-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-5 pt-6 pb-24">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-1 tracking-tight">
            Welcome back, {user?.fullName?.split(" ")[0] || "User"}
          </h2>
          <p className="text-neutral-500 mb-6 text-sm">
            Here's what's happening with your leads today.
          </p>

          <Link href="/leads" className="w-full block">
            <Button
              className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm text-base font-medium flex items-center justify-center gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              Start Calling
            </Button>
          </Link>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-2 gap-3">
          {gridItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group relative overflow-hidden rounded-2xl bg-white border border-neutral-200/60 p-5 shadow-[0_0_20px_rgba(0,0,0,0.15)] transition-all active:scale-[0.98] active:bg-neutral-50 flex flex-col items-start gap-4 min-h-[130px]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 group-hover:bg-neutral-200 transition-colors">
                  <Icon className="h-5 w-5 text-neutral-700" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-neutral-900 mt-auto">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}

"use client";

import { MobileHeader } from "@/components/mobile/header";
import { useAuth } from "@/lib/auth-context";
import { LogOut, User, Settings, HelpCircle, FileText, GitMerge, LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MorePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50/50 relative pb-[70px]">
      <MobileHeader title="More Options" showBack={false} />

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 text-2xl font-bold">
            {user?.fullName?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">{user?.fullName || "User Name"}</h2>
            <p className="text-sm text-neutral-500 font-medium mt-0.5">{user?.role || "Role"}</p>
            <p className="text-xs text-neutral-400 mt-1">{user?.email || "email@example.com"}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 overflow-hidden">
          <button className="w-full flex items-center gap-4 p-4 border-b border-neutral-100 active:bg-neutral-50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <User className="h-5 w-5" />
            </div>
            <span className="font-semibold text-neutral-900">My Profile</span>
          </button>
          <button className="w-full flex items-center gap-4 p-4 border-b border-neutral-100 active:bg-neutral-50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <Settings className="h-5 w-5" />
            </div>
            <span className="font-semibold text-neutral-900">Settings</span>
          </button>

          <button className="w-full flex items-center gap-4 p-4 border-b border-neutral-100 active:bg-neutral-50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <FileText className="h-5 w-5" />
            </div>
            <span className="font-semibold text-neutral-900">Terms & Conditions</span>
          </button>
          <button className="w-full flex items-center gap-4 p-4 active:bg-neutral-50 transition-colors">
            <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
              <HelpCircle className="h-5 w-5" />
            </div>
            <span className="font-semibold text-neutral-900">Help & Support</span>
          </button>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white text-red-600 shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-neutral-200/60 font-semibold active:bg-red-50 transition-colors mt-8"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
        
        <p className="text-center text-xs text-neutral-400 mt-8 font-medium">
          Version 1.0.0
        </p>
      </div>
    </div>
  );
}

"use client";

import { MobileHeader } from "@/components/mobile/header";
import { ChevronDown, Phone, PhoneOff, Clock } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="My Report" />

      <div className="p-4 space-y-4">
        {/* Date Filter */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-brand-200 bg-white shadow-sm">
            <span className="text-brand-900 font-semibold">Today</span>
            <ChevronDown className="h-4 w-4 text-brand-400" />
          </button>
          <button className="flex items-center justify-center px-4 py-3 rounded-xl border border-brand-200 bg-white shadow-sm">
            <Clock className="h-5 w-5 text-brand-600" />
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-100 flex flex-col items-center justify-center text-center">
            <Clock className="h-8 w-8 text-brand-500 mb-2" strokeWidth={1.5} />
            <p className="text-xl font-bold text-brand-950">00:00:00</p>
            <p className="text-[10px] uppercase font-semibold text-brand-500 mt-1">Total Call Time</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-100 flex flex-col items-center justify-center text-center">
            <PhoneOff className="h-8 w-8 text-red-400 mb-2" strokeWidth={1.5} />
            <p className="text-xl font-bold text-red-500">00:00:00</p>
            <p className="text-[10px] uppercase font-semibold text-red-400 mt-1">Unconnected Calls</p>
          </div>
        </div>

        {/* Average Duration */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-100 flex justify-between items-center">
          <p className="text-sm font-semibold text-brand-900">Average Call Duration</p>
          <p className="text-lg font-bold text-brand-600">00:00:00</p>
        </div>

        {/* Outgoing Calls Section */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
          <div className="bg-brand-50 px-4 py-3 border-b border-brand-100 flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-brand-200 flex items-center justify-center">
              <Phone className="h-3 w-3 text-brand-700" />
            </div>
            <h3 className="font-bold text-brand-900">Outgoing Calls</h3>
          </div>
          
          <div className="divide-y divide-brand-50">
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-brand-600">Total Made</span>
              <span className="font-bold text-brand-950">0</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-brand-600">Connected</span>
              <span className="font-bold text-green-600">0</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-brand-600">Not Connected</span>
              <span className="font-bold text-red-500">0</span>
            </div>
          </div>
        </div>

        {/* Incoming Calls Section */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden mb-8">
          <div className="bg-brand-50 px-4 py-3 border-b border-brand-100 flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-brand-200 flex items-center justify-center">
              <Phone className="h-3 w-3 text-brand-700" />
            </div>
            <h3 className="font-bold text-brand-900">Incoming Calls</h3>
          </div>
          
          <div className="divide-y divide-brand-50">
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-brand-600">Total Received</span>
              <span className="font-bold text-brand-950">0</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-brand-600">Connected</span>
              <span className="font-bold text-green-600">0</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-brand-600">Missed</span>
              <span className="font-bold text-red-500">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

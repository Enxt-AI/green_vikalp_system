"use client";

import { MobileHeader } from "@/components/mobile/header";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-screen flex-col bg-brand-50 relative pb-[70px]">
      <MobileHeader title="Search" showBack={false} />

      <div className="p-4 flex-1 flex flex-col">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, campaigns, or tasks..." 
            className="h-14 pl-12 rounded-2xl border-brand-200 bg-white shadow-sm text-base focus-visible:ring-brand-500"
            autoFocus
          />
        </div>

        {/* Placeholder Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
          <div className="h-20 w-20 rounded-full bg-brand-100 flex items-center justify-center mb-4">
            <SearchIcon className="h-8 w-8 text-brand-300" />
          </div>
          <h3 className="text-lg font-bold text-brand-900 mb-1">Looking for something?</h3>
          <p className="text-brand-500 max-w-[80%]">Type a name, phone number, or keyword in the search bar above.</p>
        </div>
      </div>
    </div>
  );
}

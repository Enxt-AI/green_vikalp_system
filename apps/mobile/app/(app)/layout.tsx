"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Home, Phone, Search, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/leads", icon: Phone, label: "Leads" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/more", icon: Menu, label: "More" },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-brand-50">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+70px)]">
        {children}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-brand-100 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex h-[70px] items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                  isActive ? "text-brand-600" : "text-brand-400 hover:text-brand-600"
                }`}
              >
                <div className={`flex flex-col items-center justify-center gap-1 ${
                  isActive ? "-translate-y-1 transition-transform" : ""
                }`}>
                  <Icon className={`h-6 w-6 ${isActive ? "fill-brand-100/50" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-brand-600" : "text-brand-400"}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, HardDrive, Store, Phone, Home, Building2, Target, Zap, Globe, Users, Link as LinkIcon, LucideIcon } from "lucide-react";

type NavItem = {
  name: string;
  href?: string;
  icon: LucideIcon | (({ className }: { className?: string }) => React.JSX.Element);
  children?: NavItem[];
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Pipelines", href: "/dashboard/pipelines", icon: GitBranchIcon },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: MegaphoneIcon },
  { name: "Leads", href: "/dashboard/leads", icon: UsersIcon },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckCircleIcon },
  { name: "Meetings", href: "/dashboard/meetings", icon: CalendarIcon },
  { name: "Documents", href: "/dashboard/documents", icon: FolderIcon },
  {
    name: "Integration",
    icon: IntegrationIcon,
    children: [
      {
        name: "Google",
        icon: Globe,
        children: [
          { name: "Google Sheets", href: "/dashboard/integrations/google/sheets", icon: FileSpreadsheet },
          { name: "Google Forms", href: "/dashboard/integrations/google/forms", icon: FileText },
          { name: "Google Drive", href: "/dashboard/integrations/google/drive", icon: HardDrive },
        ]
      },
      {
        name: "Lead Generation",
        icon: Users,
        children: [
          { name: "India Mart", href: "/dashboard/integrations/lead-gen/india-mart", icon: Store },
          { name: "Just Dial", href: "/dashboard/integrations/lead-gen/just-dial", icon: Phone },
          { name: "99 Acres", href: "/dashboard/integrations/lead-gen/99-acres", icon: Home },
          { name: "Magicbricks", href: "/dashboard/integrations/lead-gen/magic-bricks", icon: Building2 },
          { name: "Hubspot", href: "/dashboard/integrations/lead-gen/hubspot", icon: Target },
          { name: "Excel files", href: "/dashboard/integrations/lead-gen/excel", icon: FileSpreadsheet },
        ]
      },
      {
        name: "Third Party Integration",
        icon: LinkIcon,
        children: [
          { name: "Zapier", href: "/dashboard/integrations/third-party/zapier", icon: Zap },
        ]
      },
    ]
  },
  { name: "Workflow", href: "/dashboard/workflow", icon: GitMergeIcon },
  { name: "Template", href: "/dashboard/template", icon: LayoutTemplateIcon },
];

const adminNavigation: NavItem[] = [
  { name: "User Management", href: "/dashboard/users", icon: UserCogIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.needsPasswordChange) {
      setShowPasswordDialog(true);
    }
  }, [user?.needsPasswordChange]);

  async function handleLogout() {
    await logout();
    router.replace("/signin");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const isAdmin = user.role === "ADMIN";
  const allNavigation: NavItem[] = isAdmin
    ? [...navigation, ...adminNavigation]
    : navigation;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-neutral-200 transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-neutral-200 px-6">
            <Image
              src="/logo.webp"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-semibold text-neutral-900">Green Vikalp Systems</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {allNavigation.map((item) => {
              const isActive = pathname === item.href;
              const isExpanded = expandedMenus[item.name];

              if (item.children) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith(item.href || '/dashboard/integrations')
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      <svg
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="ml-8 space-y-1 border-l border-neutral-200 pl-2">
                        {item.children.map((child: NavItem) => {
                          const isChildActive = pathname.startsWith(child.href || "");
                          if (child.children) {
                            const isChildExpanded = expandedMenus[child.name];
                            return (
                              <div key={child.name} className="space-y-1">
                                <button
                                  onClick={() => setExpandedMenus(prev => ({ ...prev, [child.name]: !prev[child.name] }))}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isChildActive
                                    ? "bg-neutral-100 text-neutral-900"
                                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                                    }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {child.icon && <child.icon className="h-4 w-4" />}
                                    <span className="flex-1 text-left">{child.name}</span>
                                  </div>
                                  <svg
                                    className={`h-3 w-3 transition-transform ${isChildExpanded ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {isChildExpanded && (
                                  <div className="ml-4 space-y-1 border-l border-neutral-200 pl-2">
                                    {child.children.map((grandChild: NavItem) => {
                                      const isGrandChildActive = pathname === grandChild.href;
                                      return (
                                        <Link
                                          key={grandChild.name}
                                          href={grandChild.href || "#"}
                                          className={`flex items-center gap-2 block rounded-lg px-3 py-2 text-xs font-medium transition-colors ${isGrandChildActive
                                            ? "bg-green-600 text-white"
                                            : "text-neutral-500 hover:bg-green-700 hover:text-neutral-900"
                                            }`}
                                          onClick={() => setSidebarOpen(false)}
                                        >
                                          {grandChild.icon && <grandChild.icon className="h-3.5 w-3.5" />}
                                          {grandChild.name}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return (
                            <Link
                              key={child.name}
                              href={child.href || "#"}
                              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isChildActive
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                                }`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <div className="flex items-center gap-2">
                                {child.icon && <child.icon className="h-4 w-4" />}
                                <span className="flex-1 text-left">{child.name}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href || "#"}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                    ? "bg-green-600 text-white"
                    : "text-neutral-600 hover:bg-green-700 hover:text-neutral-900"
                    }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-700">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {user.fullName}
                </p>
                <p className="truncate text-xs text-neutral-500">{user.role}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:px-8">
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              className="h-6 w-6 text-neutral-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPasswordDialog(true)}
            className="text-neutral-600 hover:text-neutral-900"
          >
            <KeyIcon className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Password change dialog */}
      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        isFirstLogin={user.needsPasswordChange}
      />
    </div>
  );
}

// Icons
function IntegrationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  );
}

function GitBranchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  );
}

function UserCogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function GitMergeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  );
}

function LayoutTemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect width="18" height="7" x="3" y="3" rx="1" />
      <rect width="9" height="7" x="3" y="14" rx="1" />
      <rect width="5" height="7" x="16" y="14" rx="1" />
    </svg>
  );
}



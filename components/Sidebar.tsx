"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Target,
  FileText,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/resume", label: "My Resume", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const containerClasses = cn(
    "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
    isMobile
      ? "h-full w-full"
      : cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )
  );

  return (
    <aside className={containerClasses}>
      {/* Logo Section */}
      {isCollapsed && !isMobile ? (
        <div className="flex flex-col items-center border-b border-sidebar-border py-4 gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sidebar-primary shrink-0">
            <Zap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sidebar-primary shrink-0">
              <Zap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-base text-sidebar-foreground tracking-tight leading-none">
                HuntMode
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 mt-1.5">
                Job Search HQ
              </p>
            </div>
          </div>
          {!isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Nav Section */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={isCollapsed && !isMobile ? label : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all",
                isCollapsed && !isMobile
                  ? "justify-center p-2.5 w-10 h-10 mx-auto"
                  : "gap-3 px-3 py-2.5",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {(!isCollapsed || isMobile) && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Quick Add CTA */}
      <div className={cn("py-3", isCollapsed && !isMobile ? "px-0 text-center" : "px-3")}>
        <Link
          href="/applications/new"
          onClick={onNavigate}
          title="New Application"
          className={cn(
            "flex items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 transition-opacity",
            isCollapsed && !isMobile
              ? "w-10 h-10 mx-auto"
              : "gap-2 w-full py-2.5 px-4 text-sm font-semibold"
          )}
        >
          <Briefcase className="w-4 h-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span>New Application</span>}
        </Link>
      </div>

      {/* User Section */}
      <div
        className={cn(
          "border-t border-sidebar-border py-4",
          isCollapsed && !isMobile ? "px-0 text-center" : "px-4"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isCollapsed && !isMobile ? "flex-col gap-3" : "gap-3"
          )}
        >
          <Avatar className="h-9 w-9 mx-auto">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed || isMobile ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.displayName || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              className="p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mx-auto"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}


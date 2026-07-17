"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { HUNT_SPEND_SIDEBAR_HINT, HUNT_SPEND_SIDEBAR_LABEL } from "@/lib/usage-labels";
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
  Newspaper,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HuntModeBrand } from "@/components/HuntModeBrand";

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/resume", label: "My Resume", icon: FileText },
  { href: "/changelog", label: "What's New", icon: Megaphone },
  { href: "/blog/", label: "Blog", icon: Newspaper },
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
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "users", user.uid, "profile", "data"), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const containerClasses = cn(
    "flex flex-col bg-sidebar/70 backdrop-blur-xl text-sidebar-foreground border-r border-sidebar-border/30",
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
        <div className="flex flex-col items-center border-b border-sidebar-border/30 py-4 gap-3">
          <HuntModeBrand variant="icon" logoClassName="h-9 w-9" />
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border/30">
          <HuntModeBrand
            variant="inline"
            tagline="Job Search HQ"
            domainClassName="text-sidebar-foreground"
            taglineClassName="text-sidebar-foreground/40"
          />
          {!isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
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
          const active =
            href !== "/blog/" &&
            (pathname === href || pathname.startsWith(href + "/"));
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
                  ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-l-2 border-indigo-500 text-white font-semibold"
                  : "text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground/90"
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
            "flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-200 hover:-translate-y-[1px]",
            isCollapsed && !isMobile
              ? "w-10 h-10 mx-auto"
              : "gap-2 w-full py-2.5 px-4 text-sm font-bold"
          )}
        >
          <Briefcase className="w-4 h-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span>New Application</span>}
        </Link>
      </div>

      {/* Hunt spend (lifetime AI on HuntMode) */}
      <div className={cn("py-3 border-t border-sidebar-border/30", isCollapsed && !isMobile ? "px-0 text-center flex justify-center" : "px-4")}>
        <div
          className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/20 shadow-inner"
          title={HUNT_SPEND_SIDEBAR_HINT}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          {(!isCollapsed || isMobile) && (
            <span className="leading-tight">
              {HUNT_SPEND_SIDEBAR_LABEL}: $
              {profile?.totalEstimatedCostUsd ? profile.totalEstimatedCostUsd.toFixed(4) : "0.0000"}
            </span>
          )}
        </div>
      </div>

      {/* User Section */}
      <div
        className={cn(
          "border-t border-sidebar-border/30 py-4",
          isCollapsed && !isMobile ? "px-0 text-center" : "px-4"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isCollapsed && !isMobile ? "flex-col gap-3" : "gap-3"
          )}
        >
          <Avatar className="h-9 w-9 mx-auto border border-white/5">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-white/5 text-sidebar-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed || isMobile ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {user?.displayName || "User"}
                </p>
                <p className="text-[10px] text-sidebar-foreground/40 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              className="p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/5 transition-colors mx-auto"
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


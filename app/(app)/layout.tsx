"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("huntmode:sidebar-collapsed");
    if (saved === "true") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("huntmode:sidebar-collapsed", String(next));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading HuntMode...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      {/* Desktop Sidebar (Fixed position) */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-col flex-1 min-h-screen w-full">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-xs px-4 md:hidden w-full shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                }
              />
              <SheetContent
                side="left"
                className="p-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
                showCloseButton={false}
              >
                <Sidebar
                  isMobile={true}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 ml-1">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground tracking-tight">
                HuntMode
              </span>
            </div>
          </div>

          <Link href="/settings" className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        {/* Content Body */}
        <main
          className={cn(
            "flex-1 min-h-screen overflow-y-auto transition-all duration-300 w-full",
            isMounted && (isCollapsed ? "md:pl-16" : "md:pl-64"),
            !isMounted && "md:pl-64"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}


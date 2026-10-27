"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileCheck,
  LayoutDashboard,
  FolderCheck,
  ShieldAlert,
  LogOut,
  User,
  Compass,
  Building2,
  FilePlus2,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useQueryClient } from "@tanstack/react-query";
import { UserRole } from "@/types/auth";

interface AuthUser {
  userId: string;
  name: string;
  role: UserRole;
  email: string;
  institutionId?: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  // On /login, do not render navbar
  if (pathname === "/login") {
    return null;
  }

  const isCollege = user?.role === "COLLEGE_ADMIN" || user?.role === "COLLEGE_STAFF";
  const isOfficer =
    user?.role === "REVIEW_OFFICER" ||
    user?.role === "SENIOR_OFFICER" ||
    user?.role === "SYSTEM_ADMIN";

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "SENIOR_OFFICER":
        return {
          label: "Senior Officer",
          className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        };
      case "REVIEW_OFFICER":
        return {
          label: "Review Officer",
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "SYSTEM_ADMIN":
        return {
          label: "System Admin",
          className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        };
      case "COLLEGE_ADMIN":
        return {
          label: "College Admin",
          className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "COLLEGE_STAFF":
        return {
          label: "College Staff",
          className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        };
      default:
        return { label: role, className: "" };
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand & Home */}
          <Link
            href={isCollege ? "/college/dashboard" : "/"}
            title="Go to Home Dashboard"
            className="group flex items-center space-x-2.5 rounded-lg py-1 px-1.5 -ml-1.5 hover:bg-muted/70 transition-colors"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-xs group-hover:scale-105 transition-transform">
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  AICTE Scrutiny Studio
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Home className="h-2.5 w-2.5" />
                  <span>Home</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline -mt-0.5">
                PS 26261
              </span>
            </div>
          </Link>

          {/* Navigation Links (only rendered when authenticated) */}
          {user && (
            <nav className="flex items-center space-x-1 sm:space-x-2 text-xs font-medium text-muted-foreground">
              {/* Officer / Admin Navigation */}
              {isOfficer && (
                <>
                  <Link
                    href="/"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                      pathname === "/"
                        ? "bg-muted text-foreground font-semibold"
                        : "hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/applications"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                      pathname === "/applications"
                        ? "bg-muted text-foreground font-semibold"
                        : "hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <FolderCheck className="h-3.5 w-3.5" />
                    <span>Applications</span>
                  </Link>

                  <Link
                    href="/queue"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                      pathname === "/queue"
                        ? "bg-muted text-foreground font-semibold"
                        : "hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Review Queue</span>
                  </Link>

                  <Link
                    href="/map"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                      pathname === "/map"
                        ? "bg-muted text-primary font-semibold"
                        : "hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    <span>Regional Radar</span>
                  </Link>
                </>
              )}

              {/* College Navigation */}
              {isCollege && (
                <>
                  <Link
                    href="/college/dashboard"
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                      pathname === "/college/dashboard"
                        ? "bg-muted text-foreground font-semibold"
                        : "hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>Institution Portal</span>
                  </Link>

                  {user.role === "COLLEGE_ADMIN" && (
                    <Link
                      href="/intake"
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs font-semibold"
                    >
                      <FilePlus2 className="h-3.5 w-3.5" />
                      <span>New Submission</span>
                    </Link>
                  )}
                </>
              )}
            </nav>
          )}

          {/* Right Controls / Profile Pill */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 border border-border rounded-full pl-2 pr-1 py-0.5 bg-muted/40">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground max-w-[120px] sm:max-w-[160px] truncate">
                      {user.name}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono px-1.5 py-0 ${
                      getRoleBadge(user.role).className
                    }`}
                  >
                    {getRoleBadge(user.role).label}
                  </Badge>

                  {isCollege && user.institutionId && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] font-mono px-1 py-0 hidden md:inline-flex"
                      title={user.institutionId}
                    >
                      {user.institutionId}
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    title="Sign Out"
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : !loading ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition"
              >
                <span>Sign In</span>
              </Link>
            ) : null}
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

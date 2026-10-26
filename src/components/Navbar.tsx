"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  LayoutDashboard,
  FolderCheck,
  Plus,
  ShieldAlert,
  LogOut,
  User,
  LogIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useQueryClient } from "@tanstack/react-query";

export function Navbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(null);

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
      .catch(() => setUser(null));
  }, []);

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

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-xs">
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                AICTE Scrutiny Studio
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                PS 26261
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs font-medium text-muted-foreground">
            <Link
              href="/"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted transition"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/applications"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted transition"
            >
              <FolderCheck className="h-3.5 w-3.5" />
              <span>Applications</span>
            </Link>

            <Link
              href="/queue"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md hover:text-foreground hover:bg-muted transition"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Review Queue</span>
            </Link>

            <Link
              href="/applications/new"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Intake</span>
            </Link>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-[10px] font-mono gap-1 px-2 py-0.5">
                  <User className="h-3 w-3 text-primary" />
                  <span className="font-semibold">{user.role}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition"
              >
                <LogIn className="h-3 w-3" />
                <span>Sign In</span>
              </Link>
            )}
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

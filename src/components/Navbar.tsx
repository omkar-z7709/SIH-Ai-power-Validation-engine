import Link from "next/link";
import { FileCheck, LayoutDashboard, FolderCheck, Plus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";

export function Navbar() {
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
            <div className="hidden sm:flex items-center space-x-1.5">
              <Badge variant="outline" className="font-mono text-[10px] gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Deterministic Rules Engine
              </Badge>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

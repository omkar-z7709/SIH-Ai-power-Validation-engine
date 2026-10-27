"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  UserCheck,
  KeyRound,
  ShieldAlert,
  UserPlus,
  LogIn,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type AuthMode = "signin" | "signup";
type RoleTier = "COLLEGE_ADMIN" | "COLLEGE_STAFF" | "REVIEW_OFFICER" | "SENIOR_OFFICER" | "SYSTEM_ADMIN";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const from = searchParams.get("from") || "/";

  const [mode, setMode] = useState<AuthMode>("signin");
  const [role, setRole] = useState<RoleTier>("REVIEW_OFFICER");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [jurisdictionState, setJurisdictionState] = useState("Maharashtra");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (submitEmail?: string, submitPassword?: string) => {
    setError(null);
    setLoading(true);

    const emailToSend = submitEmail || email;
    const passwordToSend = submitPassword || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToSend, password: passwordToSend }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      const userRole = data.data?.user?.role;
      const isCollege = userRole === "COLLEGE_ADMIN" || userRole === "COLLEGE_STAFF";

      queryClient.clear();

      if (from && from !== "/login") {
        router.push(from);
      } else if (isCollege) {
        router.push("/college/dashboard");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          institutionName: role.startsWith("COLLEGE") ? institutionName : undefined,
          jurisdictionState: role.includes("OFFICER") ? jurisdictionState : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Registration failed");
      }

      queryClient.clear();
      if (role === "COLLEGE_ADMIN" || role === "COLLEGE_STAFF") {
        router.push("/college/dashboard");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-[82vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            AICTE Scrutiny & Regulatory Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Role-based institutional intake, hierarchy layers, and scrutiny officer access
          </p>
        </div>

        {/* Mode Selector Tabs: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-lg border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`py-2 rounded-md transition flex items-center justify-center gap-1.5 ${
              mode === "signin"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In to Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 rounded-md transition flex items-center justify-center gap-1.5 ${
              mode === "signup"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Register New Account</span>
          </button>
        </div>

        <Card className="shadow-xs border-border">
          <CardHeader className="p-5 pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold">
              {mode === "signin" ? "Institutional Credential Authentication" : "Select Regulatory Role Layer"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {mode === "signin"
                ? "Sign in with your verified email and role credentials"
                : "Choose your institutional or official scrutiny tier to create an authenticated profile"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {mode === "signup" && (
              /* Role Tier Selection Grid */
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Select Access Layer & Authority Level *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* First Scrutiny Officer */}
                  <button
                    type="button"
                    onClick={() => setRole("REVIEW_OFFICER")}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      role === "REVIEW_OFFICER"
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        First Scrutiny Officer
                      </span>
                      {role === "REVIEW_OFFICER" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Initial statutory document scrutiny & discrepancy flagging
                    </span>
                  </button>

                  {/* Senior / Appellate Officer */}
                  <button
                    type="button"
                    onClick={() => setRole("SENIOR_OFFICER")}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      role === "SENIOR_OFFICER"
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                        Second / Senior Officer
                      </span>
                      {role === "SENIOR_OFFICER" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Appellate review, critical escalation & final approval
                    </span>
                  </button>

                  {/* College Admin */}
                  <button
                    type="button"
                    onClick={() => setRole("COLLEGE_ADMIN")}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      role === "COLLEGE_ADMIN"
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        College Principal / Admin
                      </span>
                      {role === "COLLEGE_ADMIN" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Full institutional bundle intake & compliance submissions
                    </span>
                  </button>

                  {/* College Staff */}
                  <button
                    type="button"
                    onClick={() => setRole("COLLEGE_STAFF")}
                    className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      role === "COLLEGE_STAFF"
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                        College Staff Operator
                      </span>
                      {role === "COLLEGE_STAFF" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Upload supporting documents & view defect notices
                    </span>
                  </button>
                </div>
              </div>
            )}

            {mode === "signin" ? (
              /* Sign In Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground" /> Official / Institutional Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="officer@aicte.gov.in or college@apex.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground" /> Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold gap-1.5"
                >
                  {loading ? "Authenticating..." : "Sign In with Credentials"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              /* Sign Up Form */
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Full Name & Designation *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Verma (Scrutiny Officer)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Official Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="name@aicte.gov.in or admin@institute.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Create Secure Password (min 8 chars) *
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-9 text-xs"
                  />
                </div>

                {role.startsWith("COLLEGE") && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Affiliated Institution Name *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Apex Institute of Advanced Technology"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {role.includes("OFFICER") && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Assigned Scrutiny Jurisdiction (State / Region) *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Maharashtra or Western Region"
                      value={jurisdictionState}
                      onChange={(e) => setJurisdictionState(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 text-xs font-semibold gap-1.5"
                >
                  {loading ? "Creating Account..." : `Register as ${role.replace(/_/g, " ")}`}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </form>
            )}

            {/* Quick 1-Click Role Switcher for Live Demonstration */}
            {isDev && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Instant Demo Role Layer Access (Dev)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    1-Click
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {/* First Scrutiny Officer */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("officer@aicte.gov.in", "Officer@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">1st Officer (Scrutiny)</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">officer@aicte.gov.in</span>
                    </div>
                  </Button>

                  {/* Second / Senior Appellate Officer */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("senior.officer@aicte.gov.in", "Senior@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">2nd Officer (Senior)</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">senior.officer@aicte.gov.in</span>
                    </div>
                  </Button>

                  {/* College Admin */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("college@apex.edu.in", "College@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">College Admin</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">college@apex.edu.in</span>
                    </div>
                  </Button>

                  {/* College Staff */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("staff@apex.edu.in", "Staff@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <GraduationCap className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">College Staff</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">staff@apex.edu.in</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-xs text-muted-foreground">Loading authentication portal...</div>}>
      <AuthForm />
    </Suspense>
  );
}

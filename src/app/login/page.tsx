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
  const [selectedRegion, setSelectedRegion] = useState("PUNE");
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
          region: role === "SENIOR_OFFICER" ? "ALL" : role === "REVIEW_OFFICER" ? selectedRegion : undefined,
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
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-8">
      {/* Decorative gradient ambient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-50 dark:opacity-20" />
        <div className="w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-2xl opacity-40 dark:opacity-15 -translate-y-24 translate-x-32" />
      </div>

      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-md ring-4 ring-primary/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AICTE Scrutiny & Regulatory Portal
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Institutional verification gateway, multi-tier regulatory compliance & regional scrutiny officer access
          </p>
        </div>

        {/* Mode Selector Tabs: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-muted/80 backdrop-blur-xs rounded-xl border border-border/80 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === "signin"
                ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LogIn className="h-4 w-4 text-primary" />
            <span>Sign In to Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === "signup"
                ? "bg-card text-foreground shadow-xs font-bold border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus className="h-4 w-4 text-primary" />
            <span>Register New Account</span>
          </button>
        </div>

        <Card className="shadow-lg border-border/80 bg-card/95 backdrop-blur-sm rounded-xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
              {mode === "signin" ? "Institutional Credential Authentication" : "Select Regulatory Role Layer"}
            </CardTitle>
            <CardDescription className="text-xs">
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
                  {/* Regional Scrutiny Officer */}
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
                        Regional Scrutiny Officer
                      </span>
                      {role === "REVIEW_OFFICER" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Regional office scrutiny (Bangalore, Mumbai, Delhi, Pune)
                    </span>
                  </button>

                  {/* Central / Senior Appellate Officer */}
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
                        Central / Senior Officer
                      </span>
                      {role === "SENIOR_OFFICER" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      HQ appellate review, apex escalation & final sign-off
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
                      placeholder="e.g. Modern Institute of Technology & Research"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {role === "REVIEW_OFFICER" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Regional Office Jurisdiction *
                      </label>
                      <select
                        value={selectedRegion}
                        onChange={(e) => {
                          const reg = e.target.value;
                          setSelectedRegion(reg);
                          if (reg === "PUNE" || reg === "MUMBAI") setJurisdictionState("Maharashtra");
                          else if (reg === "BANGALORE") setJurisdictionState("Karnataka");
                          else if (reg === "DELHI") setJurisdictionState("Delhi");
                        }}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="PUNE">RO Pune (Maharashtra)</option>
                        <option value="MUMBAI">RO Mumbai (Maharashtra)</option>
                        <option value="BANGALORE">RO Bangalore (Karnataka / South)</option>
                        <option value="DELHI">RO Delhi (Delhi / North)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        State Jurisdiction *
                      </label>
                      <Input
                        type="text"
                        value={jurisdictionState}
                        onChange={(e) => setJurisdictionState(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {role === "SENIOR_OFFICER" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Jurisdiction Scope
                    </label>
                    <div className="h-9 px-3 py-2 text-xs rounded-md border border-input bg-muted/40 text-muted-foreground flex items-center justify-between">
                      <span>Central HQ - All-India Jurisdiction</span>
                      <span className="font-mono text-[10px] uppercase font-bold text-amber-600">ALL REGIONS</span>
                    </div>
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
                  {/* Central / Senior Appellate Officer */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("senior.officer@aicte.gov.in", "Senior@123456")}
                    className="h-10 justify-start text-xs font-normal gap-2 border-dashed bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30 sm:col-span-2"
                  >
                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">Central Officer (AICTE HQ / All Regions)</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">senior.officer@aicte.gov.in</span>
                    </div>
                  </Button>

                  {/* RO - Bangalore */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("officer.bangalore@aicte.gov.in", "Officer@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">RO Bangalore</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">officer.bangalore@aicte.gov.in</span>
                    </div>
                  </Button>

                  {/* RO - Mumbai */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("officer.mumbai@aicte.gov.in", "Officer@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">RO Mumbai</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">officer.mumbai@aicte.gov.in</span>
                    </div>
                  </Button>

                  {/* RO - Delhi */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("officer.delhi@aicte.gov.in", "Officer@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">RO Delhi</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">officer.delhi@aicte.gov.in</span>
                    </div>
                  </Button>

                  {/* RO - Pune */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("officer.pune@aicte.gov.in", "Officer@123456")}
                    className="h-9 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="text-left truncate">
                      <span className="font-semibold text-foreground block text-[11px]">RO Pune</span>
                      <span className="text-[9px] text-muted-foreground font-mono block">officer.pune@aicte.gov.in</span>
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

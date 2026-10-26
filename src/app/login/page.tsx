"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Building2, UserCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setError(null);
    setLoading(true);

    const submitEmail = loginEmail || email;
    const submitPassword = loginPassword || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submitEmail, password: submitPassword }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      const role = data.data?.user?.role;
      if (from && from !== "/login") {
        router.push(from);
      } else if (role === "COLLEGE_ADMIN" || role === "COLLEGE_STAFF") {
        router.push("/college/dashboard");
      } else if (role === "REVIEW_OFFICER" || role === "SENIOR_OFFICER") {
        router.push("/officer/dashboard");
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
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            AICTE Scrutiny Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in with institutional credentials or officer access
          </p>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Account Login</CardTitle>
            <CardDescription className="text-xs">
              Secure role-based access for institutions and scrutiny officers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@aicte.gov.in or admin@apex.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-muted-foreground" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-8 text-xs font-semibold gap-1.5"
              >
                {loading ? "Authenticating..." : "Sign In"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </form>

            {isDev && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Demo Accounts (Dev Only)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    1-Click
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("college@apex.edu.in", "College@123456")}
                    className="h-8 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-semibold text-foreground">College Admin</span>
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                      college@apex.edu.in
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("officer@aicte.gov.in", "Officer@123456")}
                    className="h-8 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-semibold text-foreground">Review Officer</span>
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                      officer@aicte.gov.in
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleLogin("admin@aicte.gov.in", "Admin@123456")}
                    className="h-8 justify-start text-xs font-normal gap-2 border-dashed"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-purple-500" />
                    <span className="font-semibold text-foreground">System Admin</span>
                    <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                      admin@aicte.gov.in
                    </span>
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
      <LoginForm />
    </Suspense>
  );
}

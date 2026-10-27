import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/token";

function isCollegeRole(role?: string) {
  return role === "COLLEGE_ADMIN" || role === "COLLEGE_STAFF";
}

function isPublicStatic(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicStatic(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("aicte_session")?.value ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const session = token ? await verifySessionToken(token) : null;

  // Unauthenticated handling
  if (!session) {
    if (pathname.startsWith("/api/")) {
      if (
        pathname.startsWith("/api/auth/") ||
        pathname.startsWith("/api/demo/seed") ||
        pathname.startsWith("/api/invitations/redeem")
      ) {
        return NextResponse.next();
      }
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (pathname === "/login") {
      return NextResponse.next();
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access /login
  if (pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";
    redirectUrl.pathname = isCollegeRole(session.role) ? "/college/dashboard" : "/";
    return NextResponse.redirect(redirectUrl);
  }

  // Officer-only pages: if visited by COLLEGE_ADMIN or COLLEGE_STAFF, redirect to /college/dashboard
  const isOfficerOnlyPage =
    pathname === "/" ||
    pathname === "/applications" ||
    pathname.startsWith("/queue") ||
    pathname.startsWith("/map") ||
    pathname.startsWith("/officer") ||
    pathname.startsWith("/admin");

  if (isOfficerOnlyPage && isCollegeRole(session.role)) {
    const collegeUrl = request.nextUrl.clone();
    collegeUrl.pathname = "/college/dashboard";
    return NextResponse.redirect(collegeUrl);
  }

  // College portal: if visited by non-college user (officer / admin), redirect to /
  if (pathname.startsWith("/college") && !isCollegeRole(session.role)) {
    const officerUrl = request.nextUrl.clone();
    officerUrl.pathname = "/";
    return NextResponse.redirect(officerUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

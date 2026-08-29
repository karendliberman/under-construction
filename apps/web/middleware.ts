import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@uc/db";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * One choke point. Two checks, because they answer different questions:
 * is this session valid, and is this person still allowed in. Suspending
 * someone must take effect on their next request even though their password
 * still works — which is why the second check hits the database rather than
 * trusting the cookie.
 */
export async function middleware(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const [user] = await db()
    .select({ status: users.status, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.status !== "approved") {
    return NextResponse.redirect(new URL("/login?suspended=1", request.url));
  }
  if (request.nextUrl.pathname.startsWith("/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL("/drafts", request.url));
  }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/drafts/:path*", "/admin/:path*", "/api/generations/:path*"],
};

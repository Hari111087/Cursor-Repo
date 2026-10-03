import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = [/^\/login/, /^\/api\/auth\//, /^\/api\/cron\//, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/icons\//, /^\/offline/];

/** Gate every page and API behind Hari's Google login (skipped in demo mode). */
export async function middleware(req: NextRequest) {
  const demo = process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;
  const { pathname } = req.nextUrl;
  if (demo || PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.uid) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

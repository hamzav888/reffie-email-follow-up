import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    // In Vercel Edge Runtime, req.url is the internal http:// URL even when
    // the external request is https://. Without secureCookie: true, getToken
    // looks for the un-prefixed cookie name and misses the __Secure- cookie
    // that NextAuth set in production. This was causing the redirect loop.
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/meetings/:path*"],
};

import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "toyverse_session";

export function middleware(request: NextRequest) {
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "Нужно войти в ToyVerse." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/toys/:path*"],
};

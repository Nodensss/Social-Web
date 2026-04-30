import { confirmSessionToken, SESSION_COOKIE } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, sessionCookie } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const session = await confirmSessionToken(url.searchParams.get("token"));
    const response = NextResponse.redirect(new URL("/toys", request.url));
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookie(session.expiresAt));
    return response;
  } catch (error) {
    return apiError(error);
  }
}

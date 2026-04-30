import { createTelegramSession, SESSION_COOKIE } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, sessionCookie } from "@/lib/api";

export const runtime = "nodejs";

function paramsToRecord(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}

export async function GET(request: Request) {
  try {
    const session = await createTelegramSession(paramsToRecord(new URL(request.url)));
    const response = NextResponse.redirect(new URL("/toys", request.url));
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookie(session.expiresAt));
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await createTelegramSession((await request.json()) as Record<string, unknown>);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookie(session.expiresAt));
    return response;
  } catch (error) {
    return apiError(error);
  }
}

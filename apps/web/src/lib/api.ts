import { CoreError, isCoreError, requireSessionUser, SESSION_COOKIE } from "@toyverse/core";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function requireApiUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return requireSessionUser(token);
}

export function sessionCookie(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function apiError(error: unknown) {
  if (isCoreError(error)) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof CoreError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Проверьте поля формы.", issues: error.flatten() },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Что-то пошло не так. Попробуйте ещё раз." }, { status: 500 });
}

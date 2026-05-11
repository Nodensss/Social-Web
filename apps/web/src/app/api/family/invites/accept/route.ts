import { NextResponse } from "next/server";
import { acceptFamilyInvite } from "@toyverse/core";
import { requireSessionUser, SESSION_COOKIE } from "@toyverse/core";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await requireSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
    const body = await request.json();
    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "Необходим код приглашения" }, { status: 400 });
    }

    await acceptFamilyInvite(session.user.id, body.code);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "message" in error) {
      return NextResponse.json({ error: String(error.message) }, { status: Number(error.status) });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

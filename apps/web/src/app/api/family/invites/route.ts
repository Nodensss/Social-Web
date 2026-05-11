import { NextResponse } from "next/server";
import { createFamilyInvite } from "@toyverse/core";
import { requireSessionUser, SESSION_COOKIE } from "@toyverse/core";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await requireSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
    const result = await createFamilyInvite(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && "message" in error) {
      return NextResponse.json({ error: String(error.message) }, { status: Number(error.status) });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

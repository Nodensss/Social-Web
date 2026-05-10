import { requestFriendship } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    const body = await request.json().catch(() => ({}));
    const friendship = await requestFriendship(session.user.id, body);
    return NextResponse.json({ friendship }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

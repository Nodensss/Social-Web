import { acceptFriendship } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const friendship = await acceptFriendship(session.user.id, id);
    return NextResponse.json({ friendship });
  } catch (error) {
    return apiError(error);
  }
}

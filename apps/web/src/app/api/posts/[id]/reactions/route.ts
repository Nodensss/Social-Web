import { toggleReaction } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await toggleReaction(session.user.id, id, body);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

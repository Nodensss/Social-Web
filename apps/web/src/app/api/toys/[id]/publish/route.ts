import { publishToyToFeed } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const post = await publishToyToFeed(session.user.id, id);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

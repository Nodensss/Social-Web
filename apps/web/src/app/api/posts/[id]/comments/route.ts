import { createComment, listCommentsForPost } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const comments = await listCommentsForPost(session.user.id, id);
    return NextResponse.json({ comments });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const comment = await createComment(session.user.id, id, body);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

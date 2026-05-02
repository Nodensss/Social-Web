import { listFeedForUser } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await requireApiUser();
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const page = await listFeedForUser(session.user.id, { cursor, limit });
    return NextResponse.json(page);
  } catch (error) {
    return apiError(error);
  }
}

import { getToyForUser, updateToyForUser } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const toy = await getToyForUser(session.user.id, id);
    return NextResponse.json({ toy });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const toy = await updateToyForUser(session.user.id, id, await request.json());
    return NextResponse.json({ toy });
  } catch (error) {
    return apiError(error);
  }
}

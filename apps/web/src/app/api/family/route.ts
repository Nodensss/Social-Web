import { deleteFamilyData } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    const session = await requireApiUser();
    await deleteFamilyData(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

import { exportFamily } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiUser();
    const data = await exportFamily(session.user.id);
    const filename = `toyverse-family-${data.family.id}.json`;
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

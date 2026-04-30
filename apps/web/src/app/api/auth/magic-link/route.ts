import { createMagicLink, sendMagicLinkEmail } from "@toyverse/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const magicLink = await createMagicLink(body.email);
    const delivery = await sendMagicLinkEmail(magicLink.email, magicLink.link);

    return NextResponse.json({
      ok: true,
      sent: delivery.sent,
      devLink: delivery.sent || process.env.NODE_ENV === "production" ? undefined : magicLink.link,
    });
  } catch (error) {
    return apiError(error);
  }
}

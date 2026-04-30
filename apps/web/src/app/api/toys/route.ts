import { createToy, listToysForUser } from "@toyverse/core";
import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";

export const runtime = "nodejs";

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET() {
  try {
    const session = await requireApiUser();
    const toys = await listToysForUser(session.user.id);
    return NextResponse.json({ toys });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json({ error: "Выберите фото игрушки." }, { status: 400 });
    }

    const result = await createToy({
      userId: session.user.id,
      ownerChildId: formString(formData, "ownerChildId"),
      speciesHint: formString(formData, "speciesHint"),
      colorHint: formString(formData, "colorHint"),
      childDescription: formString(formData, "childDescription"),
      file: {
        bytes: Buffer.from(await photo.arrayBuffer()),
        contentType: photo.type || "image/jpeg",
        originalName: photo.name,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createToy } from '@toyverse/core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ownerChildId, originalPhotoUrl, species, color, childDescription } = body;

    if (!ownerChildId || !originalPhotoUrl) {
      return NextResponse.json(
        { error: 'Missing ownerChildId or originalPhotoUrl' },
        { status: 400 }
      );
    }

    const toy = await createToy({
      ownerChildId,
      originalPhotoUrl,
      species,
      color,
      childDescription,
    });

    return NextResponse.json({ success: true, toy });
  } catch (error: any) {
    console.error('Error in POST /api/toys:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

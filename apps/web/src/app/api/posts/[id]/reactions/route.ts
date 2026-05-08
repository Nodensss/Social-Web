import { NextRequest, NextResponse } from 'next/server';
import { addReaction } from '@toyverse/core';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params;
    const body = await req.json();
    const { toyId, type } = body;

    if (!toyId || !type) {
      return NextResponse.json({ error: 'Missing toyId or type' }, { status: 400 });
    }

    const result = await addReaction({
      postId,
      toyId,
      type,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

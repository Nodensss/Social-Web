import { NextRequest, NextResponse } from 'next/server';
import { addComment } from '@toyverse/core';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: postId } = params;
    const body = await req.json();
    const { authorToyId, text } = body;

    if (!authorToyId || !text) {
      return NextResponse.json({ error: 'Missing authorToyId or text' }, { status: 400 });
    }

    const comment = await addComment({
      postId,
      authorToyId,
      text,
    });

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

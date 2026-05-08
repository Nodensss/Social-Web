import { NextRequest, NextResponse } from 'next/server';
import { publishPost } from '@toyverse/core';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: authorToyId } = params;
    const body = await req.json();
    const { text, mediaUrls, theme, generateByAi } = body;

    const post = await publishPost({
      authorToyId,
      text,
      mediaUrls,
      theme,
      generateByAi,
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Error publishing post:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

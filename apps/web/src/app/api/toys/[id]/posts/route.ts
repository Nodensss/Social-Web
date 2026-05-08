import { NextRequest, NextResponse } from 'next/server';
import { publishPost } from '@toyverse/core';
import { requireAuth, verifyToyBelongsToFamily } from '@/lib/auth-utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { familyId } = await requireAuth();
    const { id: authorToyId } = params;
    
    await verifyToyBelongsToFamily(authorToyId, familyId);

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
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

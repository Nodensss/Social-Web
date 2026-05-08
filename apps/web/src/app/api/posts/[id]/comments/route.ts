import { NextRequest, NextResponse } from 'next/server';
import { addComment } from '@toyverse/core';
import { requireAuth, verifyToyBelongsToFamily } from '@/lib/auth-utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { familyId } = await requireAuth();
    const { id: postId } = params;
    const body = await req.json();
    const { authorToyId, text } = body;

    if (!authorToyId || !text) {
      return NextResponse.json({ error: 'Missing authorToyId or text' }, { status: 400 });
    }

    await verifyToyBelongsToFamily(authorToyId, familyId);
    // Note: should also verify if postId belongs to the family feed. For MVP, we trust the DB relations.

    const comment = await addComment({
      postId,
      authorToyId,
      text,
    });

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getFamilyFeed } from '@toyverse/core';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const { familyId } = await requireAuth();

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const posts = await getFamilyFeed(familyId, limit);

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getFamilyFeed } from '@toyverse/core';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const familyId = searchParams.get('familyId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!familyId) {
      return NextResponse.json({ error: 'Missing familyId query parameter' }, { status: 400 });
    }

    const posts = await getFamilyFeed(familyId, limit);

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

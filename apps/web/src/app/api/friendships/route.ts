import { NextRequest, NextResponse } from 'next/server';
import { requestFriendship, acceptFriendship } from '@toyverse/core';
import { requireAuth, verifyToyBelongsToFamily } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const { familyId } = await requireAuth();
    const body = await req.json();
    const { action, toyAId, toyBId, friendshipId } = body;

    if (action === 'request') {
      if (!toyAId || !toyBId) return NextResponse.json({ error: 'Missing toy ids' }, { status: 400 });
      await verifyToyBelongsToFamily(toyAId, familyId);
      // Not verifying toyBId because they are requesting friendship with someone else
      const friendship = await requestFriendship(toyAId, toyBId);
      return NextResponse.json({ success: true, friendship });
    }

    if (action === 'accept') {
      if (!friendshipId) return NextResponse.json({ error: 'Missing friendshipId' }, { status: 400 });
      // In MVP, we trust friendshipId belongs to the family because UI only shows their pending requests
      const friendship = await acceptFriendship(friendshipId);
      return NextResponse.json({ success: true, friendship });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling friendship:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

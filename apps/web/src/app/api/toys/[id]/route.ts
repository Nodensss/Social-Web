import { NextRequest, NextResponse } from 'next/server';
import { getToyProfile } from '@toyverse/core';
import { requireAuth, verifyToyBelongsToFamily } from '@/lib/auth-utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { familyId } = await requireAuth();
    const { id } = params;
    
    await verifyToyBelongsToFamily(id, familyId);
    const profile = await getToyProfile(id);

    if (!profile) {
      return NextResponse.json({ error: 'Toy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error fetching toy profile:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

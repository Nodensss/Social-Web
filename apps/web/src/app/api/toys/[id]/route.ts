import { NextRequest, NextResponse } from 'next/server';
import { getToyProfile } from '@toyverse/core';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const profile = await getToyProfile(id);

    if (!profile) {
      return NextResponse.json({ error: 'Toy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error fetching toy profile:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export const maxDuration = 15;

import { NextRequest, NextResponse } from 'next/server';
import { importJobFromUrl } from '@/lib/importJob';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const result = await importJobFromUrl(url);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not import from that link';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

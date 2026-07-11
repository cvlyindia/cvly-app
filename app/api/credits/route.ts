import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCredits } from '@/lib/credits';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false });
  }

  // 'score' cost is used just to read status — checkCredits doesn't deduct anything.
  const status = await checkCredits(supabase, user.id, 'score');
  return NextResponse.json({ loggedIn: true, ...status });
}

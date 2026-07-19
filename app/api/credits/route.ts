import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCredits } from '@/lib/credits';
import { sendEmail, welcomeEmail } from '@/lib/email';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false });
  }

  // 'score' cost is used just to read status — checkCredits doesn't deduct anything.
  const status = await checkCredits(supabase, user.id, 'score');

  // One-time welcome email. Claim the flag FIRST (atomic: update where still null,
  // returning) and only send if this request actually won the claim — two parallel
  // first-loads can race here, and claim-before-send means the loser sends nothing.
  // Fire-and-forget: a slow or failed email must never slow this response down.
  if (user.email) {
    const email = user.email;
    supabase
      .from('user_credits')
      .update({ welcomed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('welcomed_at', null)
      .select('user_id')
      .then(({ data }) => {
        if (data && data.length > 0) {
          void sendEmail(welcomeEmail(email));
        }
      });
  }

  return NextResponse.json({ loggedIn: true, ...status });
}

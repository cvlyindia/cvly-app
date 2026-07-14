import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExtensionCorsHeaders } from '@/lib/extensionCors';

export async function OPTIONS(req: NextRequest) {
  const cors = getExtensionCorsHeaders(req.headers.get('origin'));
  return new NextResponse(null, { status: cors ? 204 : 403, headers: cors ?? {} });
}

export async function GET(req: NextRequest) {
  const cors = getExtensionCorsHeaders(req.headers.get('origin'));
  if (!cors) {
    // Not a request from an allowlisted extension origin — refuse rather than silently
    // proceeding without CORS headers, which would just fail confusingly in the browser.
    return NextResponse.json({ error: 'origin_not_allowed' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false }, { headers: cors });
  }

  const { data: latestScan } = await supabase
    .from('scans')
    .select('resume_text')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json(
    { loggedIn: true, resumeText: latestScan?.resume_text ?? null },
    { headers: cors }
  );
}

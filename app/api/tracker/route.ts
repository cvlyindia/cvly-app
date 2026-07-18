import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ jobs: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load tracker';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const { company, role, jobUrl, notes, status, scanId } = await req.json();

    if (!company || !role) {
      return NextResponse.json({ error: 'Company and role are both required' }, { status: 400 });
    }

    // A client-supplied scan ID needs real verification, not blind trust — without
    // this check, someone could link a tracker card to a scan that isn't theirs.
    let verifiedScanId: string | null = null;
    if (scanId) {
      const { data: scan } = await supabase
        .from('scans')
        .select('id')
        .eq('id', scanId)
        .eq('user_id', user.id)
        .maybeSingle();
      verifiedScanId = scan?.id ?? null;
    }

    const { data, error } = await supabase
      .from('saved_jobs')
      .insert({
        user_id: user.id,
        company: String(company).slice(0, 200),
        role: String(role).slice(0, 200),
        job_url: jobUrl ? String(jobUrl).slice(0, 500) : null,
        notes: notes ? String(notes).slice(0, 2000) : null,
        status: ['saved', 'applied', 'interview', 'offer'].includes(status) ? status : 'saved',
        scan_id: verifiedScanId,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ job: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

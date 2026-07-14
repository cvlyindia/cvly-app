export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { extractTextFromFile } from '@/lib/parseResume';
import { runFormatCheck } from '@/lib/formatCheck';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — a real resume is never remotely this large
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'That file is too large — resumes are usually well under 10MB.' }, { status: 413 });
    }

    // PDF/DOCX/TXT extraction costs nothing (no AI call involved) and stays
    // completely free. Image uploads are different — they trigger a real,
    // billed Gemini Vision call for OCR, so that specific path gets the same
    // protection every other AI-calling route already has.
    const isImage = IMAGE_TYPES.has(file.type);
    let anonIpHash: string | null = null;
    let userId: string | null = null;
    const supabase = isImage ? await createClient() : null;

    if (isImage && supabase) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const credit = await checkCredits(supabase, user.id, 'imageUpload');
        if (!credit.allowed) {
          return NextResponse.json(
            { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
            { status: 402 }
          );
        }
        userId = user.id;
      } else {
        const limit = await checkAnonymousLimit(supabase, req, 'imageUpload');
        if (!limit.allowed) {
          return NextResponse.json(
            { error: 'Free daily limit reached for this device. Sign in for your own credits, or try uploading as a PDF/DOCX instead — that stays free.' },
            { status: 429 }
          );
        }
        anonIpHash = limit.ipHash;
      }
    }

    const extraction = await extractTextFromFile(file);
    const formatCheck = await runFormatCheck(
      extraction.fileType,
      extraction.buffer,
      extraction.text,
      extraction.pdfPageCount
    );

    if (isImage && supabase) {
      if (userId) {
        await spendCredits(supabase, userId, 'imageUpload');
      } else if (anonIpHash) {
        await logAnonymousUsage(supabase, anonIpHash, 'imageUpload');
      }
    }

    return NextResponse.json({ text: extraction.text, formatCheck });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Failed to extract text';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

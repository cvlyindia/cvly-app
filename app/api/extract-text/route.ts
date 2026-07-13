import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/parseResume';
import { runFormatCheck } from '@/lib/formatCheck';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB — a real resume is never remotely this large

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

    const extraction = await extractTextFromFile(file);
    const formatCheck = await runFormatCheck(
      extraction.fileType,
      extraction.buffer,
      extraction.text,
      extraction.pdfPageCount
    );

    return NextResponse.json({ text: extraction.text, formatCheck });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to extract text';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

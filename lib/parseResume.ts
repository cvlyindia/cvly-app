import mammoth from 'mammoth';
import { extractTextFromImage } from './aiProviders';

export interface ExtractionResult {
  text: string;
  buffer: Buffer;
  fileType: string;
  pdfPageCount?: number;
}

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf') {
    // Must be imported before PDFParse itself — pdf-parse's own troubleshooting docs
    // for Next.js/serverless environments (Vercel included) call this out specifically:
    // without it, the bundler can't resolve the worker file at runtime.
    await import('pdf-parse/worker');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const text = result.pages.map((p) => p.text).join('\n\n');
      return { text, buffer, fileType: file.type, pdfPageCount: result.total };
    } finally {
      await parser.destroy();
    }
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, buffer, fileType: file.type };
  }

  if (file.type === 'text/plain') {
    return { text: buffer.toString('utf-8'), buffer, fileType: file.type };
  }

  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    const text = await extractTextFromImage(buffer, file.type);
    if (text === 'NOT_A_RESUME' || text.length < 40) {
      throw new Error("That photo doesn't look like it has readable resume text in it — try a clearer photo, or upload the actual file instead.");
    }
    return { text, buffer, fileType: file.type };
  }

  throw new Error('Unsupported file type. Please upload a PDF, DOCX, TXT, or a clear photo (JPG/PNG) of your resume.');
}

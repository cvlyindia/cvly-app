import mammoth from 'mammoth';

export interface ExtractionResult {
  text: string;
  buffer: Buffer;
  fileType: string;
  pdfPageCount?: number;
}

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf') {
    // pdf-parse is CommonJS; dynamic import avoids build-time issues
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as unknown as { default?: typeof pdfParseModule }).default ?? pdfParseModule;
    const data = await (pdfParse as unknown as (b: Buffer) => Promise<{ text: string; numpages: number }>)(buffer);
    return { text: data.text, buffer, fileType: file.type, pdfPageCount: data.numpages };
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

  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
}

import mammoth from 'mammoth';

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf') {
    // pdf-parse is CommonJS; dynamic import avoids build-time issues
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as unknown as { default?: typeof pdfParseModule }).default ?? pdfParseModule;
    const data = await (pdfParse as unknown as (b: Buffer) => Promise<{ text: string }>)(buffer);
    return data.text;
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (file.type === 'text/plain') {
    return buffer.toString('utf-8');
  }

  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
}

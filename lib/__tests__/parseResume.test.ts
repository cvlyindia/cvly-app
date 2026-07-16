import { describe, it, expect, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph } from 'docx';
import { extractTextFromFile } from '@/lib/parseResume';

// Deliberately NOT mocking pdf-parse or mammoth here — that's the whole point of this
// file. The route-level tests (extractTextRoute.test.ts) mock extractTextFromFile
// entirely, which means they exercise the route's orchestration logic (credits, auth,
// rate limits) but never actually call the real PDF/DOCX parsing libraries. That gap is
// exactly how a real production bug shipped undetected: pdf-parse did a breaking major
// rewrite, the import in lib/parseResume.ts silently broke, and all 112 existing tests
// stayed green because none of them actually parsed a real file. These tests close that
// gap by generating genuine PDF/DOCX buffers in-process and running them through the
// real extraction pipeline, no mocks.

vi.mock('@/lib/aiProviders', () => ({ extractTextFromImage: vi.fn() }));
import { extractTextFromImage } from '@/lib/aiProviders';
const mockExtractImage = vi.mocked(extractTextFromImage);

async function buildRealPdf(lines: string[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = 750;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font });
    y -= 20;
  }
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

async function buildRealDocx(lines: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [{ children: lines.map((l) => new Paragraph(l)) }],
  });
  return Packer.toBuffer(doc);
}

function makeFile(buffer: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(buffer)], name, { type });
}

const RESUME_LINES = [
  'Jane Doe - Senior Software Engineer',
  'Work Experience',
  'Software Engineer at Acme Corp, Jan 2020 - Present',
  'Education',
  'BTech Computer Science, 2016 - 2020',
];

describe('extractTextFromFile — real PDF parsing, no mocks', () => {
  it('extracts real, readable text from a genuinely generated PDF', async () => {
    const buffer = await buildRealPdf(RESUME_LINES);
    const file = makeFile(buffer, 'resume.pdf', 'application/pdf');

    const result = await extractTextFromFile(file);

    expect(result.fileType).toBe('application/pdf');
    expect(result.text).toContain('Jane Doe');
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toContain('BTech Computer Science');
    expect(result.pdfPageCount).toBe(1);
  }, 15000); // pdf.js worker init is measurably slower under full-suite resource
             // contention than in isolation — 15s gives real headroom without
             // masking a genuine hang if the parsing logic actually breaks.

  it('correctly counts pages on a real multi-page PDF', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 3; i++) {
      const page = pdfDoc.addPage();
      page.drawText(`Page ${i + 1} content`, { x: 50, y: 750, size: 12, font });
    }
    const buffer = Buffer.from(await pdfDoc.save());
    const file = makeFile(buffer, 'multi.pdf', 'application/pdf');

    const result = await extractTextFromFile(file);

    expect(result.pdfPageCount).toBe(3);
    expect(result.text).toContain('Page 1');
    expect(result.text).toContain('Page 3');
  });
});

describe('extractTextFromFile — real DOCX parsing, no mocks', () => {
  it('extracts real, readable text from a genuinely generated DOCX', async () => {
    const buffer = await buildRealDocx(RESUME_LINES);
    const file = makeFile(
      buffer,
      'resume.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    const result = await extractTextFromFile(file);

    expect(result.fileType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.text).toContain('Jane Doe');
    expect(result.text).toContain('BTech Computer Science');
  });
});

describe('extractTextFromFile — plain text, no mocks needed', () => {
  it('reads plain text files directly', async () => {
    const file = makeFile(Buffer.from('Jane Doe resume text'), 'resume.txt', 'text/plain');
    const result = await extractTextFromFile(file);
    expect(result.text).toBe('Jane Doe resume text');
  });
});

describe('extractTextFromFile — image dispatch (Gemini Vision itself mocked, dispatch logic is not)', () => {
  it('routes image/jpeg to the vision extractor and returns its result', async () => {
    mockExtractImage.mockResolvedValue('Transcribed resume text from photo, definitely long enough');
    const file = makeFile(Buffer.from('fake jpeg bytes'), 'resume.jpg', 'image/jpeg');
    const result = await extractTextFromFile(file);
    expect(result.text).toContain('Transcribed resume text');
    expect(mockExtractImage).toHaveBeenCalledWith(expect.any(Buffer), 'image/jpeg');
  });

  it('rejects an unreadable photo rather than returning garbage', async () => {
    mockExtractImage.mockResolvedValue('NOT_A_RESUME');
    const file = makeFile(Buffer.from('fake jpeg bytes'), 'notaresume.jpg', 'image/jpeg');
    await expect(extractTextFromFile(file)).rejects.toThrow("doesn't look like it has readable resume text");
  });
});

describe('extractTextFromFile — unsupported types', () => {
  it('throws a clear error for an unsupported file type', async () => {
    const file = makeFile(Buffer.from('data'), 'resume.exe', 'application/x-msdownload');
    await expect(extractTextFromFile(file)).rejects.toThrow('Unsupported file type');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/parseResume', () => ({ extractTextFromFile: vi.fn() }));
vi.mock('@/lib/formatCheck', () => ({ runFormatCheck: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));
vi.mock('@/lib/anonymousLimit', () => ({ checkAnonymousLimit: vi.fn(), logAnonymousUsage: vi.fn() }));

import { extractTextFromFile } from '@/lib/parseResume';
import { runFormatCheck } from '@/lib/formatCheck';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';
import { POST } from '@/app/api/extract-text/route';

const mockExtract = vi.mocked(extractTextFromFile);
const mockFormatCheck = vi.mocked(runFormatCheck);
const mockCreateClient = vi.mocked(createClient);
const mockCheckCredits = vi.mocked(checkCredits);
const mockSpendCredits = vi.mocked(spendCredits);
const mockCheckAnonymousLimit = vi.mocked(checkAnonymousLimit);
const mockLogAnonymousUsage = vi.mocked(logAnonymousUsage);

function fakeRequestWithFile(file: File | null): NextRequest {
  const formData = new Map<string, File>();
  if (file) formData.set('file', file);
  return {
    formData: async () => ({ get: (key: string) => formData.get(key) ?? null }),
    headers: { get: () => null },
  } as unknown as NextRequest;
}

function mockSupabaseWithUser(user: { id: string } | null) {
  const fakeSupabase = { auth: { getUser: async () => ({ data: { user } }) } };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFormatCheck.mockResolvedValue({ score: 100, issues: [], passed: [], checked: false });
});

describe('POST /api/extract-text — basic validation', () => {
  it('returns 400 with no file, touching nothing else', async () => {
    const res = await POST(fakeRequestWithFile(null));
    expect(res.status).toBe(400);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('returns 413 for an oversized file before ever attempting extraction', async () => {
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
    const res = await POST(fakeRequestWithFile(bigFile));
    expect(res.status).toBe(413);
    expect(mockExtract).not.toHaveBeenCalled();
  });
});

describe('POST /api/extract-text — PDF/DOCX/TXT stays completely free (the common case)', () => {
  it('never touches auth, credits, or rate limiting for a non-image file — the actual invariant that keeps this path free', async () => {
    const pdfFile = new File(['fake pdf bytes'], 'resume.pdf', { type: 'application/pdf' });
    mockExtract.mockResolvedValue({ text: 'Jane Doe — Senior Software Engineer with 6 years of backend experience', buffer: Buffer.from(''), fileType: 'application/pdf' });

    const res = await POST(fakeRequestWithFile(pdfFile));

    expect(res.status).toBe(200);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCheckCredits).not.toHaveBeenCalled();
    expect(mockCheckAnonymousLimit).not.toHaveBeenCalled();
    expect(mockSpendCredits).not.toHaveBeenCalled();
    expect(mockLogAnonymousUsage).not.toHaveBeenCalled();
  });

  it('same for DOCX and TXT — the free path applies to every non-image type, not just PDF specifically', async () => {
    const docxFile = new File(['fake docx bytes'], 'resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    mockExtract.mockResolvedValue({ text: 'Jane Doe — Product Manager with cross-functional leadership experience', buffer: Buffer.from(''), fileType: docxFile.type });
    await POST(fakeRequestWithFile(docxFile));
    expect(mockCreateClient).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mockFormatCheck.mockResolvedValue({ score: 100, issues: [], passed: [], checked: false });
    const txtFile = new File(['plain text resume'], 'resume.txt', { type: 'text/plain' });
    mockExtract.mockResolvedValue({ text: 'Jane Doe — Product Manager with cross-functional leadership experience', buffer: Buffer.from(''), fileType: 'text/plain' });
    await POST(fakeRequestWithFile(txtFile));
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('POST /api/extract-text — image uploads get real protection (the fix for the gap found earlier)', () => {
  it('logged in, has credits: extracts and spends exactly one imageUpload credit', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    const imgFile = new File(['fake jpeg bytes'], 'resume.jpg', { type: 'image/jpeg' });
    mockExtract.mockResolvedValue({ text: 'transcribed resume text', buffer: Buffer.from(''), fileType: 'image/jpeg' });

    const res = await POST(fakeRequestWithFile(imgFile));

    expect(res.status).toBe(200);
    expect(mockSpendCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'imageUpload');
  });

  it('logged in, out of credits: blocks with 402 and never attempts the real OCR call — the actual cost-protection invariant', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: false, remaining: 0, plan: 'free', cost: 1, resetAt: '' });
    const imgFile = new File(['fake jpeg bytes'], 'resume.jpg', { type: 'image/jpeg' });

    const res = await POST(fakeRequestWithFile(imgFile));

    expect(res.status).toBe(402);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('anonymous, under budget: extracts and logs anonymous usage, never spendCredits', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: true, ipHash: 'hash1', cost: 1 });
    const imgFile = new File(['fake png bytes'], 'resume.png', { type: 'image/png' });
    mockExtract.mockResolvedValue({ text: 'transcribed text', buffer: Buffer.from(''), fileType: 'image/png' });

    const res = await POST(fakeRequestWithFile(imgFile));

    expect(res.status).toBe(200);
    expect(mockLogAnonymousUsage).toHaveBeenCalledWith(expect.anything(), 'hash1', 'imageUpload');
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous, over budget: blocks with 429 and never attempts OCR — this is the exact gap that was found and fixed', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: false, ipHash: 'hash1', cost: 1 });
    const imgFile = new File(['fake jpeg bytes'], 'resume.jpg', { type: 'image/jpeg' });

    const res = await POST(fakeRequestWithFile(imgFile));

    expect(res.status).toBe(429);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('never spends a credit or logs usage if the OCR extraction itself fails (e.g. an unreadable photo)', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    const imgFile = new File(['fake jpeg bytes'], 'resume.jpg', { type: 'image/jpeg' });
    mockExtract.mockRejectedValue(new Error("That photo doesn't look like it has readable resume text in it"));

    const res = await POST(fakeRequestWithFile(imgFile));

    expect(res.status).toBe(500);
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });
});

describe('POST /api/extract-text — scanned/image-only PDF safeguard (the real gap found from a live bug report)', () => {
  it('rejects with a clear, actionable message when extraction succeeds but returns almost no real text — the actual symptom of a scanned PDF with no text layer', async () => {
    const pdfFile = new File(['fake pdf bytes'], 'resume.pdf', { type: 'application/pdf' });
    mockExtract.mockResolvedValue({ text: '   ', buffer: Buffer.from(''), fileType: 'application/pdf' });

    const res = await POST(fakeRequestWithFile(pdfFile));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/scanned image/i);
  });

  it('does not falsely trigger on a genuinely short but real resume (e.g. a very brief one)', async () => {
    const pdfFile = new File(['fake pdf bytes'], 'resume.pdf', { type: 'application/pdf' });
    // 50+ real characters — should NOT be treated as suspiciously empty
    mockExtract.mockResolvedValue({ text: 'Jane Doe — Software Engineer with 5 years experience in backend systems', buffer: Buffer.from(''), fileType: 'application/pdf' });
    mockFormatCheck.mockResolvedValue({ score: 90, issues: [], passed: [], checked: true });

    const res = await POST(fakeRequestWithFile(pdfFile));
    expect(res.status).toBe(200);
  });

  it('does not apply this safeguard to image uploads — a short OCR result there is a different, already-handled failure mode', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    const imgFile = new File(['fake jpeg bytes'], 'resume.jpg', { type: 'image/jpeg' });
    mockExtract.mockResolvedValue({ text: 'NOT_A_RESUME', buffer: Buffer.from(''), fileType: 'image/jpeg' });
    mockFormatCheck.mockResolvedValue({ score: 0, issues: [], passed: [], checked: false });

    const res = await POST(fakeRequestWithFile(imgFile));
    // Short OCR text for images is intentionally NOT caught by the PDF-specific
    // 422 safeguard — that's a separate path already covered by extractTextFromFile
    // itself rejecting unreadable photos.
    expect(res.status).not.toBe(422);
  });
});


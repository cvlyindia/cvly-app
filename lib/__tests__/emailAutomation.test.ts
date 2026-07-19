import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { sendEmail, welcomeEmail, proActivatedEmail, topUpConfirmedEmail, followUpReminderEmail } from '@/lib/email';

describe('email templates', () => {
  it('welcome email carries the daily-credits hook and the no-fabrication note', () => {
    const e = welcomeEmail('user@example.com');
    expect(e.to).toBe('user@example.com');
    expect(e.html).toContain('5 free credits every day');
    expect(e.html).toContain('never invent');
  });

  it('pro email lists the actual Pro features, not vague promises', () => {
    const e = proActivatedEmail('user@example.com');
    expect(e.html).toContain('100 credits every day');
    expect(e.html).toContain('LinkedIn profile review');
    expect(e.html).toContain('cancel any time');
  });

  it('top-up email states the exact credit amount purchased', () => {
    const e = topUpConfirmedEmail('user@example.com', 120);
    expect(e.subject).toContain('120');
    expect(e.html).toContain('<strong>120 credits</strong>');
  });

  it('follow-up reminder names the real company, role, and elapsed days', () => {
    const e = followUpReminderEmail('user@example.com', 'Acme Corp', 'Backend Engineer', 9);
    expect(e.subject).toContain('Acme Corp');
    expect(e.subject).toContain('9 days');
    expect(e.html).toContain('Backend Engineer');
    expect(e.html).toContain('/tracker');
  });

  it('every template links back to the site and includes the brand shell', () => {
    for (const e of [welcomeEmail('a@b.c'), proActivatedEmail('a@b.c'), topUpConfirmedEmail('a@b.c', 40), followUpReminderEmail('a@b.c', 'X', 'Y', 7)]) {
      expect(e.html).toContain('cvly.in');
      expect(e.html).toContain('Cvly');
    }
  });
});

describe('sendEmail without RESEND_API_KEY', () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('returns false and never throws — the exact production state until the env var is added', async () => {
    const result = await sendEmail({ to: 'a@b.c', subject: 'x', html: '<p>x</p>' });
    expect(result).toBe(false);
  });
});

describe('follow-up reminders cron auth', () => {
  it('rejects a caller without the correct CRON_SECRET bearer token', async () => {
    process.env.CRON_SECRET = 'real-secret';
    const { GET } = await import('@/app/api/cron/follow-up-reminders/route');
    const req = { headers: new Headers({ authorization: 'Bearer wrong-secret' }) } as unknown as import('next/server').NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('rejects everything when CRON_SECRET is not configured at all — fails closed, not open', async () => {
    delete process.env.CRON_SECRET;
    vi.resetModules();
    const { GET } = await import('@/app/api/cron/follow-up-reminders/route');
    const req = { headers: new Headers({ authorization: 'Bearer anything' }) } as unknown as import('next/server').NextRequest;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

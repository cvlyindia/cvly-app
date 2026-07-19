import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';

const FROM = 'Cvly <hello@cvly.in>';
const SITE = 'https://cvly.in';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null; // not configured yet — emails silently skip, nothing breaks
  return new Resend(key);
}

/** Shared branded shell — warm dark header with the prism accent line, clean body,
 * quiet footer. Inline styles only (email clients ignore stylesheets). */
function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#F6F3F0;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3F0;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#1C1512;border-radius:14px 14px 0 0;padding:22px 32px;">
  <span style="color:#F3EEE9;font-size:19px;font-weight:bold;letter-spacing:-0.3px;">Cvly</span>
</td></tr>
<tr><td style="height:4px;background:linear-gradient(100deg,#FF7A1E 0%,#F43F7A 52%,#9B5DE5 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px;border-radius:0 0 14px 14px;">
  <h1 style="margin:0 0 16px;font-size:21px;color:#14121A;letter-spacing:-0.3px;">${title}</h1>
  ${bodyHtml}
</td></tr>
<tr><td style="padding:20px 32px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#938E9E;line-height:1.6;">
    Cvly — resume checks that tell you the truth.<br/>
    <a href="${SITE}/settings" style="color:#938E9E;">Manage account</a> · <a href="${SITE}" style="color:#938E9E;">cvly.in</a>
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:999px;background:linear-gradient(100deg,#FF7A1E 0%,#F43F7A 100%);">
  <a href="${href}" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

const P = 'margin:0 0 14px;font-size:14px;color:#3D3A45;line-height:1.65;';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/** Central send — never throws into the caller. A failed email must never fail
 * a payment webhook, a page load, or anything else it rides along with. */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({ from: FROM, ...payload });
    if (error) {
      Sentry.captureMessage('Email send failed', { level: 'warning', extra: { subject: payload.subject, error } });
      return false;
    }
    return true;
  } catch (err) {
    Sentry.captureException(err, { tags: { context: 'email-send' } });
    return false;
  }
}

export function welcomeEmail(to: string): EmailPayload {
  return {
    to,
    subject: 'Welcome to Cvly — here\'s how to get your first result in 2 minutes',
    html: layout('Welcome to Cvly', `
      <p style="${P}">You're in. Here's the fastest way to something genuinely useful:</p>
      <p style="${P}"><strong>1.</strong> Upload your resume and paste a real job description.<br/>
      <strong>2.</strong> Get your ATS score and see exactly which keywords the role wants that you're missing.<br/>
      <strong>3.</strong> Use the rewrite to close the gap — then check the new version against the same role.</p>
      <p style="${P}">You get <strong>5 free credits every day</strong> — they refresh daily, so there's always a reason to keep improving.</p>
      ${button(SITE, 'Check my resume')}
      <p style="${P}">One honest note: we never invent achievements or fake numbers in rewrites. What you get is your real experience, presented properly.</p>
    `),
  };
}

export function proActivatedEmail(to: string): EmailPayload {
  return {
    to,
    subject: 'Your Cvly Pro plan is active',
    html: layout('Pro is active — everything\'s unlocked', `
      <p style="${P}">Payment received and your Pro plan is live. You now have:</p>
      <p style="${P}">• <strong>100 credits every day</strong> (20x the free plan)<br/>
      • <strong>100 tailored interview questions</strong> per role, grounded in your actual resume<br/>
      • <strong>LinkedIn profile review</strong> and <strong>Portfolio review</strong><br/>
      • <strong>Analytics</strong> — your score trend and application funnel<br/>
      • Priority processing on every generation</p>
      ${button(`${SITE}/dashboard`, 'Open my dashboard')}
      <p style="${P}">Manage or cancel any time from Settings — no hoops, no emails to support required.</p>
    `),
  };
}

export function topUpConfirmedEmail(to: string, credits: number): EmailPayload {
  return {
    to,
    subject: `${credits} credits added to your Cvly account`,
    html: layout('Credits added', `
      <p style="${P}">Payment received — <strong>${credits} credits</strong> have been added to your account and are ready to use now. Top-up credits don't expire with the daily reset.</p>
      ${button(`${SITE}/dashboard`, 'Use them now')}
    `),
  };
}

export function followUpReminderEmail(to: string, company: string, role: string, daysAgo: number): EmailPayload {
  return {
    to,
    subject: `Follow up on ${company}? It's been ${daysAgo} days`,
    html: layout(`Time to nudge ${company}`, `
      <p style="${P}">You applied for <strong>${role}</strong> at <strong>${company}</strong> ${daysAgo} days ago and it's still marked "Applied" in your tracker.</p>
      <p style="${P}">A short, polite follow-up after about a week genuinely moves applications — it signals real interest and puts your name back on top of the pile. Two or three sentences is enough: reaffirm interest, mention one specific thing about the role, ask if they need anything else from you.</p>
      ${button(`${SITE}/tracker`, 'Open my tracker')}
      <p style="${P}">If you've moved forward already — congrats! Update the card's status and we'll stop nudging about this one.</p>
    `),
  };
}

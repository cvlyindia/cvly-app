# Incident Response Runbook

One page, on purpose. If it's longer than this during a real incident, it won't get read.

## How you'll find out something's wrong

1. **Sentry** — an error spike or a new issue type. Check dashboard first.
2. **UptimeRobot** (once set up) — an email/SMS saying the site didn't respond.
3. **A user reports it** — via the chatbot's "email a real person" path or support@cvly.in.
   Slowest signal, and the one that costs the most trust — the goal of the first two is
   to catch things before this ever happens.

## First 5 minutes: figure out what's actually broken

Don't start fixing yet — spend two minutes narrowing down which of these it is, since the
fix and urgency are completely different for each:

| Symptom | Likely cause | Check first |
|---|---|---|
| Site won't load at all | Vercel deployment/outage | [vercel-status.com](https://www.vercel-status.com) — then Vercel dashboard → Deployments |
| Site loads, every AI feature fails | Gemini + all fallbacks down, or an API key expired/revoked | Sentry for the exact error; check Gemini/Groq/OpenRouter/Cerebras status pages |
| Site loads, login/signup broken | Supabase Auth issue, or a misconfigured OAuth provider | [status.supabase.com](https://status.supabase.com) — then Supabase dashboard → Auth logs |
| Everything works but data looks wrong/missing | Database issue — RLS policy, a bad migration, or a service-role key problem | Supabase dashboard → Logs → Postgres logs |
| Payments failing (once Razorpay is live) | Razorpay outage, or a webhook signature/config issue | [Razorpay status page](https://status.razorpay.com) — then check recent webhook delivery logs in the Razorpay dashboard |
| Slow but not down | Cold start, a stuck AI provider in the fallback chain, or a genuine traffic spike | Sentry performance tab, Vercel function logs |

## While it's ongoing

- **Don't panic-deploy a fix without testing it.** A rushed second bug on top of the
  first is the actual worst outcome, not a few extra minutes of downtime.
- If it's a bad deploy: **Vercel dashboard → Deployments → find the last known-good one
  → "Promote to Production."** This is faster than debugging forward, and buys time to
  fix properly without the clock running.
- If it's a third-party outage (Gemini, Supabase, Razorpay): there's nothing to fix on
  Cvly's end. Note the start time, keep an eye on their status page, and consider a
  banner on the site if it's affecting real usage (Settings/homepage — keep it honest
  and specific, not vague).

## After it's resolved

Write down, even briefly, in this file or a linked doc:
- What broke, and when (rough timestamps)
- What actually fixed it
- Whether it's the kind of thing a test or a Sentry alert should have caught earlier,
  and if so, add that — this is exactly how the test suite and monitoring are supposed
  to grow, from real incidents, not guessing in advance what might break.

## Contacts / escalation

Solo-founder stage: it's Anurag. No other escalation path exists yet — this section
exists so it's not forgotten once there's a team, not because it's needed today.

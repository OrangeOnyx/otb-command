# Email Workflow Runbook

Last verified: 2026-05-11 (Wave 7)

## Architecture

```
Controller (invoices / notices / etc.)
    │
    ├─► EmailSenderService.send()           (synchronous, no retry)
    │       └─► nodemailer transporter      (Gmail SMTP, pool=true, max=5)
    │
    └─► EmailQueueService.enqueue()         (async, retry+backoff)
            └─► Bull queue 'email'
                └─► EmailQueueProcessor.handleSend()
                        └─► EmailSenderService.send()
```

Both paths share `EmailSenderService`, so the **mock-mode safety switch
applies uniformly**: SMTP not configured OR `EMAIL_DELIVERY_DISABLED=true`
=> the email is logged but never delivered.

Current callers (invoices, notices, tenant invites, password reset) call
`EmailSenderService.send()` directly. The queue path is in place for any
future caller that wants resilient retry without inventing its own.

## Environment variables

| Var | Required? | Default | Notes |
|---|---|---|---|
| `SMTP_HOST` | yes (prod) | — | Gmail: `smtp.gmail.com` |
| `SMTP_PORT` | no | 587 | Use 465 for implicit TLS |
| `SMTP_USER` | yes | — | `adam@belle-realty.com` in prod |
| `SMTP_PASS` | yes | — | Gmail App Password, NOT account password |
| `FROM_EMAIL` | no | `BELLE_REALTY.LESSOR_EMAIL` | Display sender |
| `EMAIL_DELIVERY_DISABLED` | no | unset | **Set to `true` in prod today.** Hard safety while we beta. |
| `REDIS_URL` | yes (prod) | `redis://localhost:6379` | BullMQ backend |

Gmail SMTP setup notes:
1. The account must have 2FA enabled.
2. Generate an "App Password" for "Mail" — that's the value of `SMTP_PASS`.
3. The regular Google account password will NOT work.

## Health endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/v1/health` | public | liveness |
| `GET /api/v1/health/ready` | public | DB connectivity |
| `GET /api/v1/health/email` | public | SMTP verify + Redis queue counts |

Example response from `/health/email`:

```json
{
  "timestamp": "2026-05-11T18:30:00.000Z",
  "smtp": {
    "configured": true,
    "deliveryDisabled": true,
    "verified": true
  },
  "queue": {
    "queueAvailable": true,
    "waiting": 0, "active": 0, "delayed": 0, "failed": 0
  }
}
```

Interpretation:
- `smtp.configured=true && smtp.verified=true`: SMTP handshake succeeds, we
  can deliver mail to the real internet.
- `smtp.deliveryDisabled=true`: the safety switch is on — every send is
  logged but the recipient never receives anything.
- `queue.queueAvailable=false`: Redis is unreachable. Sync sends still work
  via `EmailSenderService` directly, but queued retries are degraded.

## How to verify end-to-end (before flipping the safety switch)

1. **Confirm health is green**
   ```
   curl https://api-production-ddd6.up.railway.app/api/v1/health/email
   ```
   Expect `smtp.configured=true`, `smtp.verified=true`, `queue.queueAvailable=true`.

2. **Send a test email to an address you control (NOT a real tenant)**
   Temporarily flip `EMAIL_DELIVERY_DISABLED=false` on the prod API:
   ```
   railway variables --set EMAIL_DELIVERY_DISABLED=false --service api --environment production
   ```
   Then trigger an invoice send through the UI to `adam+test@adamabdalla.com`
   (or whichever address you control). Verify:
   - Email arrives in inbox
   - HTML body renders
   - PDF attachment present
   - API logs show `Email sent to ... — messageId: <gmail-id>`

3. **Restore the safety switch IMMEDIATELY**
   ```
   railway variables --set EMAIL_DELIVERY_DISABLED=true --service api --environment production
   ```

4. **Document the verified state** by updating this file's "Last verified"
   date and adding a note to the priority queue in the next continuity file.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `smtp.verified=false`, `configured=true` | Wrong password / app password expired | Regenerate Gmail App Password, update `SMTP_PASS` |
| `smtp.configured=false` | Missing env var | Set `SMTP_HOST`/`USER`/`PASS` on Railway API service |
| `queue.queueAvailable=false` | Redis service down or wrong `REDIS_URL` | Check Railway Redis plugin; verify `REDIS_URL` |
| All sends return `mocked=true` even after flipping switch | Forgot to redeploy after env var change | `railway up --service api --detach` |
| Bulk send hits Gmail rate limit | Gmail SMTP free tier ≈ 500/day, 100/hour | Switch to SendGrid / Postmark, or batch via queue with delay |

## Queue retry policy (default)

Defined in `EmailQueueService.enqueue()`:

```ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
}
```

Override per-call if a specific use case needs different behavior (e.g.
bulk drip sends with longer delays). Failed jobs are retained for 500
records so they can be inspected via Bull Board if ever installed.

## Migrating an existing caller to the queue

Before (synchronous):
```ts
const result = await this.emailSender.send({ to, subject, html, attachments });
```

After (queued with retry):
```ts
const outcome = await this.emailQueue.enqueue(
  { to, subject, html, attachments, trace: `invoice:${invoiceId}` },
);
```

The queue service falls back to a sync send if Redis is unavailable, so
callers don't have to branch.

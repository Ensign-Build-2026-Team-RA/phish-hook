# Inbound email analysis links

The existing Analyze tab is rendered at the site's root URL. The email flow opens
that same tab and textarea using `https://phishhook.lol/#analyze?t=<token>`.
`#analyze` opens the same page without a prefill. There is no new analysis page and
no automatic AI submission.

The token flow replaces the earlier requirement to keep all incoming contents
only in memory. The user authorized temporary Worker storage to shorten the link.
Existing `#analyze?message=...` links remain readable for backward compatibility,
but new replies never embed an email body in the URL.

## Configuration

All addresses at `phishhook.lol` receive mail, including `bait@phishhook.lol`
and `report@phishhook.lol`. Replies always use `report@phishhook.lol`; the public
site is `https://phishhook.lol/`. These are configured as `RECEIVING_DOMAIN`,
`REPLY_EMAIL`, and `SITE_URL` in `wrangler.jsonc`. The reply address must belong
to the configured receiving domain. The existing `phish-hook` Worker has `fetch()` and
`email()` handlers. Wrangler is used because the repository already has its config.

Only Cloudflare Email Routing and the existing Worker are used. Replies call
`message.reply()` inside the incoming email event. No outbound Email Sending
binding or service, paid plan upgrade, or AI call during email receipt is added.
`EMAIL_MESSAGES` is a Workers KV binding, with `EMAIL_TTL_SECONDS` set to `86400`
(24 hours). Supported expiry values are 3,600 through 604,800 seconds (one hour
through seven days). Email Workers remain subject to Workers Free CPU/request limits.
Cloudflare's separate Email Sending service requires a paid plan for arbitrary
outbound recipients and is intentionally not configured here.

After confirming the domain and address, check the current rules and mail records
before enabling Email Routing. Do not replace another provider's existing MX or
SPF records without resolving that conflict first. Deploy the tested Worker, enable
Email Routing for `phishhook.lol`, and enable its catch-all rule with action
`worker` and value `phish-hook`. The existing literal rule for `bait@phishhook.lol`
also points to that Worker. Do not enable Email Sending.

Wrangler 4.149.0 rejects Worker targets in its catch-all update command, even
though the Cloudflare API supports them. This catch-all was configured through
`PUT /zones/{zone_id}/email/routing/rules/catch_all` with `enabled: true`, an
`all` matcher, and action `{ "type": "worker", "value": ["phish-hook"] }`.
Verify it with `npx wrangler email routing rules get phishhook.lol catch-all`.

Replies require incoming DMARC authentication to pass, a Message-ID, a reply to
the envelope sender, and the same domain for the reply sender and inbound recipient.
Cloudflare rejects reply chains with more than 100 References entries. Automated
and mailing-list messages are rejected to prevent reply loops. Failed replies use
a generic rejection; no email metadata or exception text is logged.

## Privacy and limits

The Worker reads and parses MIME in memory, then stores **only the complete parsed
body and its expiry time** in KV. Raw MIME, sender/recipient addresses, subjects,
headers and attachments are not stored. Message contents, tokens, storage keys and
exceptions are never logged by this flow. Worker observability is disabled to
avoid collecting email event metadata. A single reply contains the link and
retention notice. It replies to the envelope sender rather than Reply-To.

Each link uses 128 bits of cryptographically random data encoded as a 22-character
token. KV keys contain a SHA-256 digest of that token, so listing keys does not
reveal usable links. Anyone with the link can read the message until expiry; this
is bearer access, not an account login. KV automatically expires the entry. The
API independently checks the stored expiry to reject stale cached values. Failed
replies attempt to delete the stored entry; if deletion fails, its TTL still applies.

The page takes the token from the fragment, removes it from browser history and
sends it in the body of `POST /api/email-message`. Neither tokens nor message
bodies appear in that endpoint's URL. Responses and client requests use
`Cache-Control: no-store`/`cache: 'no-store'`. Other origins are rejected and no
permissive CORS headers are attached to this endpoint. Loading retrieves the text
but never invokes Workers AI. A retry button handles temporary failures and KV
propagation delays, which can take up to a minute across locations. Links remain
reusable until expiry; email security scanners cannot consume them permanently.

Plain text is preserved after MIME decoding. HTML-only messages are converted to
plain text, including link destinations, without executing or loading HTML.
Messages containing any attachments, including inline MIME images, receive the
normal page link and an explanation that attachments cannot be analyzed. Nothing
is stored for those links. No partial body is silently substituted for a message
containing attachments.

The handler buffers at most 64 KiB of raw MIME. It verifies actual stream size as
well as the declared size. Parsed bodies must fit the existing 5,000-character
textarea/API limit. Token links are approximately 60 characters regardless of
body encoding. Messages over the raw or decoded limit receive the normal
`#analyze` link and a limitation explanation; no truncated body is stored or sent.
Empty or unreadable bodies also receive a normal link.
Cloudflare may reject emails larger than its inbound platform limit before the
Worker runs.

The client retrieves the body into its existing textarea and waits for the user
to click Analyze.
For that browser session, imported text and edits stay in React memory and are
excluded from saved drafts and analysis history. Clicking Analyze uses the existing
API and sends the reviewed text to Workers AI as before.

The free KV allowance is 1,000 writes, 100,000 reads and 1 GB stored data. Limits
are shared with other KV use on this account. No paid plan is enabled. If writes
fail (including exhausted free quota), the Worker replies with the normal page
link and a clear storage-unavailable explanation, never a long body URL. Reads
that fail produce a retryable generic error without disclosing contents.

## Validation

Run `npm ci` at the repository root and `npm ci --prefix phish-hook`, then:

```powershell
npm run lint
npm test
npm run build --prefix phish-hook
npx wrangler deploy --dry-run
```

Email tests use synthetic MIME messages and an in-memory reply transport. They
check plain text, HTML, transfer encoding, attachments, size bounds, parser and
quota failures, random tokens, TTL, expired entries, address selection, threading,
and suppression of sensitive logs. Browser tests mount the actual App in Strict
Mode and check token retrieval, retries, cancellation of old imports, manual
submission, fragment removal and exclusion from local storage/history.

Also run `npx wrangler dev --local` and post synthetic MIME to
`/cdn-cgi/local/email?from=sender@example.com&to=anything@phishhook.lol`.
Wrangler's local email simulator writes synthetic reply `.eml` files under
`.wrangler/tmp/email`; inspect their token links against the local retrieval API
and remove those synthetic reply files afterward. Never use real email contents
with the simulator or debugging logs. Local KV is simulated; production KV is not
used by these runtime checks.

Before treating live delivery as verified, send a real email from a DMARC-valid
account you control to `bait@phishhook.lol`, follow the reply link, and confirm the
body is prefilled. Do not use live mail contents in screenshots or logging tools.

References: [Email Routing replies](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/#reply-to-emails),
[pricing](https://developers.cloudflare.com/email-service/platform/pricing/),
[platform limits](https://developers.cloudflare.com/email-service/platform/limits/).

KV references: [expiration](https://developers.cloudflare.com/kv/api/write-key-value-pairs/#expiring-keys),
[free quotas](https://developers.cloudflare.com/workers/platform/pricing/#workers-kv),
[consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

## Outlook delivery troubleshooting

A Cloudflare `delivered` event means the recipient mail server accepted the
reply, not that it appears in Inbox. For Microsoft 365, check Junk, mailbox rules,
and [Defender quarantine](https://security.microsoft.com/quarantine). An admin
may need to run message trace or inspect quarantine entries hidden from users.
The domain publishes Cloudflare SPF, routing DKIM and `_dmarc` with
`v=DMARC1; p=none`. No aggregate or forensic report mailbox is configured.
Token links shorten the reply, but do not prove or guarantee Outlook delivery.

# Inbound email analysis links

The existing Analyze tab is rendered at the site's root URL. The email flow opens
that same tab and textarea using `https://phishhook.lol/#analyze?message=...`.
`#analyze` opens the same page without a prefill. There is no new analysis page and
no automatic AI submission.

## Configuration

All addresses at `phishhook.lol` receive mail, including `bait@phishhook.lol`
and `report@phishhook.lol`. Replies always use `report@phishhook.lol`; the public
site is `https://phishhook.lol/`. These are configured as `RECEIVING_DOMAIN`,
`REPLY_EMAIL`, and `SITE_URL` in `wrangler.jsonc`. The reply address must belong
to the configured receiving domain. The existing `phish-hook` Worker has `fetch()` and
`email()` handlers. Wrangler is used because the repository already has its config.

Only Cloudflare Email Routing and the existing Worker are used. Replies call
`message.reply()` inside the incoming email event. No outbound Email Sending
binding or service, paid plan upgrade, AI call during email receipt, or storage
binding is added. Email Workers remain subject to Workers Free CPU/request limits.
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

The Worker reads and parses MIME only in memory. It never saves, forwards, logs,
or caches incoming bodies, addresses, subjects, attachment contents, or parser
errors. A single reply contains the link; the original subject and sender details
are not copied into the reply body. It replies to the envelope sender rather than
an untrusted Reply-To header.

Plain text is preserved after MIME decoding. HTML-only messages are converted to
plain text, including link destinations, without executing or loading HTML.
Messages containing any attachments, including inline MIME images, receive the
normal page link and an explanation that attachments cannot be analyzed. No
partial body is silently substituted for a message containing attachments.

The handler buffers at most 64 KiB of raw MIME. It verifies actual stream size as
well as the declared size. A prefilled link is at most 2,000 characters and its
decoded body must fit the existing 5,000-character textarea/API limit. Messages
over any limit receive the normal `#analyze` link and a limitation explanation;
no truncated body is sent. Empty or unreadable bodies also receive a normal link.
Cloudflare may reject emails larger than its inbound platform limit before the
Worker runs.

The client reads the fragment into its existing textarea, removes the fragment
from the current browser history entry, and waits for the user to click Analyze.
For that browser session, imported text and edits stay in React memory and are
excluded from saved drafts and analysis history. The fragment is never placed in
a query string or submitted automatically. Clicking Analyze uses the existing
API and sends the reviewed text to Workers AI as before.

Anyone with a prefilled link can read its message; the email provider and email
client can also see that link. The privacy promise concerns this application's
storage and logs, not the sender's or recipient's email infrastructure.

## Validation

Run `npm ci` at the repository root and `npm ci --prefix phish-hook`, then:

```powershell
npm run lint
npm test
npm run build --prefix phish-hook
npx wrangler deploy --dry-run
```

Email tests use synthetic MIME messages and an in-memory reply transport. They
check plain text, HTML, transfer encoding, attachments, size bounds, parser
failures, address selection, threading, and suppression of sensitive logs. Browser
tests mount the actual App and check prefilling, manual submission, fragment
removal, and exclusion from local storage/history. They send no real emails and
write no incoming email fixtures to disk.

Before treating live delivery as verified, send a real email from a DMARC-valid
account you control to `bait@phishhook.lol`, follow the reply link, and confirm the
body is prefilled. Do not use live mail contents in screenshots or logging tools.

References: [Email Routing replies](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/#reply-to-emails),
[pricing](https://developers.cloudflare.com/email-service/platform/pricing/),
[platform limits](https://developers.cloudflare.com/email-service/platform/limits/).

import PostalMime from 'postal-mime'
import { createMimeMessage } from 'mimetext'
import { compile } from 'html-to-text'
import { createAnalysisLink, createTokenAnalysisLink, MAX_MESSAGE_LENGTH } from '../shared/analysis-link.ts'
import { storeEmailBody } from './email-storage.js'
import { quickEmailRating, formatQuickEmailRating } from './email-rating.js'

export const MAX_RAW_EMAIL_BYTES = 64 * 1024

const htmlToText = compile({
  wordwrap: false,
  // Never let the converter truncate or log input; raw size is bounded below.
  limits: { maxInputLength: undefined, maxDepth: undefined, maxChildNodes: undefined, maxBaseElements: undefined },
  selectors: [{ selector: 'img', format: 'skip' }],
})

// Bound buffering before MIME parsing to keep this handler within Free plan resources.
async function readBoundedEmail(message) {
  if (message.rawSize > MAX_RAW_EMAIL_BYTES) {
    await message.raw.cancel()
    return null
  }
  const reader = message.raw.getReader()
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_RAW_EMAIL_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const raw = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    raw.set(chunk, offset)
    offset += chunk.byteLength
  }
  return raw
}

export async function prepareEmailReply(message, env) {
  const normalLink = createAnalysisLink(env.SITE_URL)
  if (!normalLink) throw new Error('The configured site URL is too long.')
  let link = normalLink
  let explanation
  let storedKey
  let storedHours
  let rating = null
  let hasAttachments = false
  try {
    const raw = await readBoundedEmail(message)
    if (raw === null) {
      explanation = 'This email is too large to process safely on the free service. No content was included in the link or truncated. Paste the message manually (the page accepts up to 5,000 characters).'
    } else {
      const parsed = await PostalMime.parse(raw)
      const body = parsed.text?.trim() ? parsed.text : parsed.html ? htmlToText(parsed.html) : ''
      // Subject is considered in memory only; it is never stored or echoed.
      rating = quickEmailRating(body, parsed.subject)
      hasAttachments = parsed.attachments.length > 0
      if (hasAttachments) {
        explanation = 'This email contains attachments, including possibly inline images. Attachments cannot be included in an analysis link, so no content was included or silently discarded. Open the page and paste the relevant message text manually; the scanner does not analyze attachments.'
      } else {
        if (body.trim() && body.length <= MAX_MESSAGE_LENGTH) {
          try {
            const stored = await storeEmailBody(env, body)
            storedKey = stored.key
            storedHours = stored.ttlSeconds / 3600
            link = createTokenAnalysisLink(env.SITE_URL, stored.token)
            explanation = `Your email body is prefilled when you open this link. The link expires after ${storedHours} hour${storedHours === 1 ? '' : 's'}. Review it, then click Analyze with Cloudflare AI. Opening the link does not start an analysis.`
          } catch {
            if (storedKey) {
              try { await env.EMAIL_MESSAGES.delete(storedKey) } catch { /* Expiration still removes the entry. */ }
              storedKey = undefined
            }
            explanation = 'Temporary email link storage is unavailable. No message content was included in the link. Open the page and paste the message manually.'
          }
        } else {
          explanation = body.trim()
            ? 'The complete message exceeds the page\'s 5,000 character limit. No content was stored or truncated. Open the page and paste the text manually within that limit.'
            : 'No readable plain text or HTML body was found. Open the page and paste the message manually.'
        }
      }
    }
  } catch {
    // Parser exceptions can contain email contents. Never log or expose them.
    explanation = 'This email could not be read safely. No content was included in the link. Open the page and paste the message manually.'
  }
  const privacy = storedKey
    ? `Only your parsed message body is temporarily stored for ${storedHours} hour${storedHours === 1 ? '' : 's'} and then expires automatically. The link contains a random token, not your email text. Anyone with this link can read the message until it expires.`
    : 'No message content is stored for this link.'
  const quickCheck = formatQuickEmailRating(rating, hasAttachments)
  const text = `${quickCheck}\n\nOpen Analyse Message for the full assessment:\n${link}\n\n${explanation}\n\n${privacy} Sender addresses, subjects and attachments are not stored. Imported messages are excluded from browser drafts and history. Only clicking Analyze sends the reviewed message to Cloudflare Workers AI.`
  return { link, text, storedKey }
}

const validAddress = (address) => typeof address === 'string' && /^[^\s<>@]+@[^\s<>@]+$/.test(address)
const addressDomain = (address) => validAddress(address) ? address.split('@')[1].toLowerCase() : null

export async function handleEmail(message, env, EmailMessage) {
  const receivingDomain = typeof env.RECEIVING_DOMAIN === 'string' ? env.RECEIVING_DOMAIN.toLowerCase() : ''
  if (!env.SITE_URL || !receivingDomain || addressDomain(env.REPLY_EMAIL) !== receivingDomain) {
    message.setReject('Email analysis is not configured.')
    return
  }
  if (addressDomain(message.to) !== receivingDomain) {
    message.setReject('This receiving domain is not configured for analysis.')
    return
  }
  if (!validAddress(message.from) || message.from.toLowerCase() === message.to.toLowerCase()
    || message.from.toLowerCase() === env.REPLY_EMAIL.toLowerCase()) {
    message.setReject('An automatic reply cannot be sent to this envelope sender.')
    return
  }
  const automatic = message.headers.get('auto-submitted')
  if ((automatic && automatic.toLowerCase().trim() !== 'no') || message.headers.has('list-id')) {
    message.setReject('Automated or mailing list messages are not accepted to prevent reply loops.')
    return
  }
  const messageId = message.headers.get('message-id')
  if (!messageId || messageId.length > 998 || /[\r\n]/.test(messageId)) {
    message.setReject('A valid Message-ID is required for an email reply.')
    return
  }
  let storedKey
  try {
    const prepared = await prepareEmailReply(message, env)
    storedKey = prepared.storedKey
    const reply = createMimeMessage()
    reply.setSender(env.REPLY_EMAIL)
    reply.setRecipient(message.from)
    reply.setSubject('Your Phishing Hook analysis link')
    reply.setHeader('In-Reply-To', messageId)
    reply.setHeader('References', messageId)
    reply.setHeader('Auto-Submitted', 'auto-replied')
    reply.addMessage({ contentType: 'text/plain', data: prepared.text })
    // Email Routing replies use the inbound event; no paid Email Sending binding.
    await message.reply(new EmailMessage(env.REPLY_EMAIL, message.from, reply.asRaw()))
  } catch {
    if (storedKey) {
      try { await env.EMAIL_MESSAGES.delete(storedKey) } catch { /* Expiration still removes the entry. */ }
    }
    message.setReject('The analysis reply could not be sent. Please use the website directly.')
  }
}

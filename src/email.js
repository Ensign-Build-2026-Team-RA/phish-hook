import PostalMime from 'postal-mime'
import { createMimeMessage } from 'mimetext'
import { compile } from 'html-to-text'
import { createAnalysisLink } from '../shared/analysis-link.ts'

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

export async function prepareEmailReply(message, siteUrl) {
  const normalLink = createAnalysisLink(siteUrl)
  if (!normalLink) throw new Error('The configured site URL is too long.')
  let link = normalLink
  let explanation
  try {
    const raw = await readBoundedEmail(message)
    if (raw === null) {
      explanation = 'This email is too large to process safely on the free service. No content was included in the link or truncated. Paste the message manually (the page accepts up to 5,000 characters).'
    } else {
      const parsed = await PostalMime.parse(raw)
      if (parsed.attachments.length > 0) {
        explanation = 'This email contains attachments, including possibly inline images. Attachments cannot be included in an analysis link, so no content was included or silently discarded. Open the page and paste the relevant message text manually; the scanner does not analyze attachments.'
      } else {
        const body = parsed.text?.trim() ? parsed.text : parsed.html ? htmlToText(parsed.html) : ''
        const prefilledLink = body.trim() ? createAnalysisLink(siteUrl, body) : null
        if (prefilledLink) {
          link = prefilledLink
          explanation = 'Your email body is prefilled when you open this link. Review it, then click Analyze with Cloudflare AI. Opening the link does not start an analysis.'
        } else {
          explanation = body.trim()
            ? 'The complete message is too large for a safe email link or exceeds the page\'s 5,000 character limit. No content was included or truncated. Open the page and paste the text manually within that limit.'
            : 'No readable plain text or HTML body was found. Open the page and paste the message manually.'
        }
      }
    }
  } catch {
    // Parser exceptions can contain email contents. Never log or expose them.
    explanation = 'This email could not be read safely. No content was included in the link. Open the page and paste the message manually.'
  }
  const text = `Open Analyse Message:\n${link}\n\n${explanation}\n\nWe do not save incoming email contents. Treat a prefilled link as private: anyone with the link can read its message. The message is carried in the URL fragment, which is not sent to the website server. The page keeps imported messages in memory. Only clicking Analyze sends the message to Cloudflare Workers AI.`
  return { link, text }
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
  try {
    const { text } = await prepareEmailReply(message, env.SITE_URL)
    const reply = createMimeMessage()
    reply.setSender(env.REPLY_EMAIL)
    reply.setRecipient(message.from)
    reply.setSubject('Your Phishing Hook analysis link')
    reply.setHeader('In-Reply-To', messageId)
    reply.setHeader('Auto-Submitted', 'auto-replied')
    reply.addMessage({ contentType: 'text/plain', data: text })
    // Email Routing replies use the inbound event; no paid Email Sending binding.
    await message.reply(new EmailMessage(env.REPLY_EMAIL, message.from, reply.asRaw()))
  } catch {
    message.setReject('The analysis reply could not be sent. Please use the website directly.')
  }
}

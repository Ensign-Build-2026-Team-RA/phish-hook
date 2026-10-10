import { afterEach, describe, expect, it, vi } from 'vitest'
import PostalMime from 'postal-mime'
import { handleEmail, prepareEmailReply, MAX_RAW_EMAIL_BYTES } from '../src/email.js'
import { createAnalysisLink, readAnalysisFragment } from '../shared/analysis-link.ts'

const env = { SITE_URL: 'https://phishhook.lol/', RECEIVING_EMAIL: 'bait@phishhook.lol' }
const mime = (body, type = 'text/plain; charset=utf-8', extra = '') =>
  `From: sender@example.com\r\nTo: bait@phishhook.lol\r\nMessage-ID: <test@example.com>\r\nMIME-Version: 1.0\r\nContent-Type: ${type}\r\n${extra}\r\n${body}`

function incoming(raw, headers = {}) {
  return {
    from: 'sender@example.com',
    to: env.RECEIVING_EMAIL,
    headers: new Headers({ 'message-id': '<test@example.com>', ...headers }),
    raw: new Response(raw).body,
    rawSize: new TextEncoder().encode(raw).byteLength,
    reply: vi.fn().mockResolvedValue(undefined),
    setReject: vi.fn(),
  }
}

class MemoryEmailMessage {
  constructor(from, to, raw) { Object.assign(this, { from, to, raw }) }
}

afterEach(() => vi.restoreAllMocks())

describe('inbound email analysis links', () => {
  it('replies once to the envelope sender with the complete plain text in the fragment', async () => {
    const input = incoming(mime('Urgent: verify your account.\r\nDo not trust this link: https://fake.example/login'), { 'reply-to': 'different@example.com' })
    const warn = vi.spyOn(console, 'warn')
    const log = vi.spyOn(console, 'log')
    const error = vi.spyOn(console, 'error')
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.reply).toHaveBeenCalledTimes(1)
    const reply = input.reply.mock.calls[0][0]
    expect(reply.from).toBe(env.RECEIVING_EMAIL)
    expect(reply.to).toBe(input.from)
    const parsedReply = await PostalMime.parse(reply.raw)
    const link = parsedReply.text.match(/https:\/\/\S+/)[0]
    const url = new URL(link)
    expect(url.pathname).toBe('/')
    expect(url.search).toBe('')
    expect(readAnalysisFragment(url.hash).message.trim()).toBe('Urgent: verify your account.\nDo not trust this link: https://fake.example/login')
    expect(parsedReply.headers.find(header => header.key === 'in-reply-to').value).toBe('<test@example.com>')
    expect(parsedReply.headers.find(header => header.key === 'auto-submitted').value).toBe('auto-replied')
    expect(input.setReject).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('converts HTML entities, paragraphs and link destinations to plain text without rendering HTML', async () => {
    const { link } = await prepareEmailReply(incoming(mime('<p>Hello &amp; goodbye.</p><p>Verify <a href="https://fake.example">your account</a>.</p><script>privateScript()</script>', 'text/html; charset=utf-8')), env.SITE_URL)
    const body = readAnalysisFragment(new URL(link).hash).message
    expect(body).toContain('Hello & goodbye.')
    expect(body).toContain('https://fake.example')
    expect(body).not.toContain('<p>')
    expect(body).not.toContain('privateScript')
  })

  it('decodes quoted-printable MIME before constructing the link', async () => {
    const { link } = await prepareEmailReply(incoming(mime('Caf=C3=A9 =E2=9C=93', 'text/plain; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable\r\n')), env.SITE_URL)
    expect(readAnalysisFragment(new URL(link).hash).message.trim()).toBe('Café ✓')
  })

  it.each(['x'.repeat(5001), '私'.repeat(300)])('uses a normal link for oversized decoded or encoded messages', async (body) => {
    const { link, text } = await prepareEmailReply(incoming(mime(body)), env.SITE_URL)
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('No content was included or truncated')
    expect(text).not.toContain(body)
  })

  it('explains attachments instead of dropping them and sending a partial body', async () => {
    const raw = mime('--boundary\r\nContent-Type: text/plain\r\n\r\nBody with attachment\r\n--boundary\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="file.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nVGVzdA==\r\n--boundary--', 'multipart/mixed; boundary="boundary"')
    const { link, text } = await prepareEmailReply(incoming(raw), env.SITE_URL)
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('contains attachments')
    expect(text).not.toContain('Body with attachment')
  })

  it('does not buffer a large raw email and replies with the limitation', async () => {
    const input = incoming(mime('Small body'))
    input.rawSize = MAX_RAW_EMAIL_BYTES + 1
    const cancel = vi.spyOn(input.raw, 'cancel')
    const { link, text } = await prepareEmailReply(input, env.SITE_URL)
    expect(cancel).toHaveBeenCalledOnce()
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('too large to process')
  })

  it('enforces the buffering limit even when rawSize is incorrect', async () => {
    const input = incoming(mime('x'.repeat(MAX_RAW_EMAIL_BYTES + 1)))
    input.rawSize = 1
    expect((await prepareEmailReply(input, env.SITE_URL)).text).toContain('too large to process')
  })

  it('provides a normal link when the MIME parser rejects input, without logging the error', async () => {
    vi.spyOn(PostalMime, 'parse').mockRejectedValue(new Error('Email content must not be logged'))
    const log = vi.spyOn(console, 'error')
    const { link, text } = await prepareEmailReply(incoming(mime('Message')), env.SITE_URL)
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('could not be read safely')
    expect(log).not.toHaveBeenCalled()
  })

  it('rejects an unconfigured address and automated replies without sending', async () => {
    for (const [headers, settings] of [[{}, {}], [{ 'auto-submitted': 'auto-replied' }, env], [{ 'list-id': '<list.example>' }, env]]) {
      const input = incoming(mime('Message'), headers)
      await handleEmail(input, settings, MemoryEmailMessage)
      expect(input.setReject).toHaveBeenCalledOnce()
      expect(input.reply).not.toHaveBeenCalled()
    }
  })

  it('handles reply failures without exposing email metadata in errors or logs', async () => {
    const input = incoming(mime('Message'))
    input.reply.mockRejectedValue(new Error('Sensitive sender details'))
    const log = vi.spyOn(console, 'error')
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.setReject.mock.calls[0][0]).not.toContain('Sensitive')
    expect(log).not.toHaveBeenCalled()
  })

  it('rejects damaged and oversized fragments without partial prefills', () => {
    expect(readAnalysisFragment('#analyze?message=%ZZ')).toMatchObject({ message: '', error: expect.any(String) })
    expect(readAnalysisFragment('#analyze?message=' + 'x'.repeat(5001)).message).toBe('')
    expect(readAnalysisFragment('#unrelated')).toBeNull()
    expect(() => createAnalysisLink('https://site.example/?message=private', 'Text')).toThrow()
    expect(createAnalysisLink(env.SITE_URL, 'a + b & c # d \n ✓')).toContain('#analyze?message=')
  })
})

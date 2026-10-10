import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PostalMime from 'postal-mime'
import { handleEmail, prepareEmailReply, MAX_RAW_EMAIL_BYTES } from '../src/email.js'
import { createAnalysisLink, readAnalysisFragment } from '../shared/analysis-link.ts'
import { retrieveEmailBody } from '../src/email-storage.js'
import { mockEmailStorage } from './email-storage.mock.js'

const env = { SITE_URL: 'https://phishhook.lol/', RECEIVING_DOMAIN: 'phishhook.lol', REPLY_EMAIL: 'report@phishhook.lol' }
beforeEach(() => { env.EMAIL_MESSAGES = mockEmailStorage() })

async function bodyFromLink(link) {
  const { token } = readAnalysisFragment(new URL(link).hash)
  expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
  const response = await retrieveEmailBody(new Request('https://phishhook.lol/api/email-message', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  }), env)
  expect(response.status).toBe(200)
  return (await response.json()).message
}
const mime = (body, type = 'text/plain; charset=utf-8', extra = '') =>
  `From: sender@example.com\r\nTo: bait@phishhook.lol\r\nMessage-ID: <test@example.com>\r\nMIME-Version: 1.0\r\nContent-Type: ${type}\r\n${extra}\r\n${body}`

function incoming(raw, headers = {}) {
  return {
    from: 'sender@example.com',
    to: 'bait@phishhook.lol',
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
  it('replies once with a short token link that retrieves the complete plain text', async () => {
    const input = incoming(mime('Urgent: verify your account.\r\nDo not trust this link: https://fake.example/login'), { 'reply-to': 'different@example.com' })
    const warn = vi.spyOn(console, 'warn')
    const log = vi.spyOn(console, 'log')
    const error = vi.spyOn(console, 'error')
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.reply).toHaveBeenCalledTimes(1)
    const reply = input.reply.mock.calls[0][0]
    expect(reply.from).toBe(env.REPLY_EMAIL)
    expect(reply.to).toBe(input.from)
    const parsedReply = await PostalMime.parse(reply.raw)
    expect(parsedReply.from.address).toBe(env.REPLY_EMAIL)
    const link = parsedReply.text.match(/https:\/\/\S+/)[0]
    const url = new URL(link)
    expect(url.pathname).toBe('/')
    expect(url.search).toBe('')
    expect((await bodyFromLink(link)).trim()).toBe('Urgent: verify your account.\nDo not trust this link: https://fake.example/login')
    expect(link.length).toBeLessThan(65)
    expect(parsedReply.text).not.toContain('https://fake.example/login')
    expect(parsedReply.text).toContain('expires after 24 hours')
    expect(env.EMAIL_MESSAGES.put).toHaveBeenCalledOnce()
    expect(JSON.parse(env.EMAIL_MESSAGES.put.mock.calls[0][1])).toEqual({ message: expect.any(String), expiresAt: expect.any(Number) })
    expect(parsedReply.headers.find(header => header.key === 'in-reply-to').value).toBe('<test@example.com>')
    expect(parsedReply.headers.find(header => header.key === 'auto-submitted').value).toBe('auto-replied')
    expect(input.setReject).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it.each(['bait@phishhook.lol', 'hello@phishhook.lol', 'anything+tag@phishhook.lol', 'report@phishhook.lol', 'Other@PHISHHOOK.LOL'])('accepts %s and replies from the fixed report address', async (recipient) => {
    const input = incoming(mime('Message to analyze'))
    input.to = recipient
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.setReject).not.toHaveBeenCalled()
    expect(input.reply).toHaveBeenCalledOnce()
    const reply = input.reply.mock.calls[0][0]
    expect(reply.from).toBe('report@phishhook.lol')
    expect((await PostalMime.parse(reply.raw)).from.address).toBe('report@phishhook.lol')
    expect(reply.to).toBe(input.from)
  })

  it.each(['recipient@phishhook.lol.evil', 'recipient@sub.phishhook.lol', 'recipient@example.com'])('rejects an unrelated receiving domain: %s', async (recipient) => {
    const input = incoming(mime('Message'))
    input.to = recipient
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.setReject).toHaveBeenCalledOnce()
    expect(input.reply).not.toHaveBeenCalled()
  })

  it('rejects a reply sender configured outside the receiving domain', async () => {
    const input = incoming(mime('Message'))
    await handleEmail(input, { ...env, REPLY_EMAIL: 'report@example.com' }, MemoryEmailMessage)
    expect(input.setReject).toHaveBeenCalledWith('Email analysis is not configured.')
    expect(input.reply).not.toHaveBeenCalled()
  })

  it('does not reply to the report address itself, preventing a reply loop', async () => {
    const input = incoming(mime('Message'))
    input.from = env.REPLY_EMAIL
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.setReject).toHaveBeenCalledOnce()
    expect(input.reply).not.toHaveBeenCalled()
  })

  it('converts HTML entities, paragraphs and link destinations to plain text without rendering HTML', async () => {
    const { link } = await prepareEmailReply(incoming(mime('<p>Hello &amp; goodbye.</p><p>Verify <a href="https://fake.example">your account</a>.</p><script>privateScript()</script>', 'text/html; charset=utf-8')), env)
    const body = await bodyFromLink(link)
    expect(body).toContain('Hello & goodbye.')
    expect(body).toContain('https://fake.example')
    expect(body).not.toContain('<p>')
    expect(body).not.toContain('privateScript')
  })

  it('decodes quoted-printable MIME before constructing the link', async () => {
    const { link } = await prepareEmailReply(incoming(mime('Caf=C3=A9 =E2=9C=93', 'text/plain; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable\r\n')), env)
    expect((await bodyFromLink(link)).trim()).toBe('Café ✓')
  })

  it('uses a normal link for messages exceeding the textarea limit', async () => {
    const body = 'x'.repeat(5001)
    const { link, text } = await prepareEmailReply(incoming(mime(body)), env)
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('No content was stored or truncated')
    expect(text).not.toContain(body)
    expect(env.EMAIL_MESSAGES.put).not.toHaveBeenCalled()
  })

  it('keeps the complete Unicode body even when an old message fragment would be too long', async () => {
    const body = '私'.repeat(4000)
    const { link } = await prepareEmailReply(incoming(mime(body)), env)
    expect(link.length).toBeLessThan(65)
    expect((await bodyFromLink(link)).trim()).toBe(body)
  })

  it('explains attachments instead of dropping them and sending a partial body', async () => {
    const raw = mime('--boundary\r\nContent-Type: text/plain\r\n\r\nBody with attachment\r\n--boundary\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="file.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nVGVzdA==\r\n--boundary--', 'multipart/mixed; boundary="boundary"')
    const { link, text } = await prepareEmailReply(incoming(raw), env)
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('contains attachments')
    expect(text).not.toContain('Body with attachment')
    expect(env.EMAIL_MESSAGES.put).not.toHaveBeenCalled()
  })

  it('does not buffer a large raw email and replies with the limitation', async () => {
    const input = incoming(mime('Small body'))
    input.rawSize = MAX_RAW_EMAIL_BYTES + 1
    const cancel = vi.spyOn(input.raw, 'cancel')
    const { link, text } = await prepareEmailReply(input, env)
    expect(cancel).toHaveBeenCalledOnce()
    expect(link).toBe('https://phishhook.lol/#analyze')
    expect(text).toContain('too large to process')
  })

  it('enforces the buffering limit even when rawSize is incorrect', async () => {
    const input = incoming(mime('x'.repeat(MAX_RAW_EMAIL_BYTES + 1)))
    input.rawSize = 1
    expect((await prepareEmailReply(input, env)).text).toContain('too large to process')
  })

  it('provides a normal link when the MIME parser rejects input, without logging the error', async () => {
    vi.spyOn(PostalMime, 'parse').mockRejectedValue(new Error('Email content must not be logged'))
    const log = vi.spyOn(console, 'error')
    const { link, text } = await prepareEmailReply(incoming(mime('Message')), env)
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
    expect(env.EMAIL_MESSAGES.delete).toHaveBeenCalledOnce()
    expect(env.EMAIL_MESSAGES.values.size).toBe(0)
  })

  it('sends a normal link when storage quota is exhausted without exposing email data', async () => {
    env.EMAIL_MESSAGES.put.mockRejectedValue(new Error('Sensitive message and key'))
    const log = vi.spyOn(console, 'error')
    const input = incoming(mime('Private body'))
    await handleEmail(input, env, MemoryEmailMessage)
    expect(input.reply).toHaveBeenCalledOnce()
    const reply = await PostalMime.parse(input.reply.mock.calls[0][0].raw)
    expect(reply.text).toContain('https://phishhook.lol/#analyze')
    expect(reply.text).toContain('storage is unavailable')
    expect(reply.text).not.toContain('Private body')
    expect(reply.text).not.toContain('Sensitive')
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

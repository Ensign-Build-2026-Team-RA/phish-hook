import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from '../src/index.js'
import { storeEmailBody } from '../src/email-storage.js'
import { mockEmailStorage } from './email-storage.mock.js'

const request = (token, options = {}) => new Request('https://phishhook.lol/api/email-message', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers },
  body: JSON.stringify({ token }), ...options,
})
afterEach(() => vi.restoreAllMocks())

describe('temporary tokenized email storage', () => {
  it('uses random tokens, hashed keys, minimal records and automatic expiry', async () => {
    const env = { EMAIL_MESSAGES: mockEmailStorage(), EMAIL_TTL_SECONDS: '3600' }
    const first = await storeEmailBody(env, 'Private message ✓')
    const second = await storeEmailBody(env, 'Different message')
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(first.token).not.toBe(second.token)
    expect(first.key).not.toContain(first.token)
    expect(env.EMAIL_MESSAGES.put.mock.calls[0][2]).toEqual({ expirationTtl: 3600 })
    expect(env.EMAIL_MESSAGES.values.get(first.key)).toEqual({ message: 'Private message ✓', expiresAt: expect.any(Number) })
    const response = await worker.fetch(request(first.token), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect((await response.json()).message).toBe('Private message ✓')
    expect(env.EMAIL_MESSAGES.get.mock.calls[0][1]).toEqual({ type: 'json', cacheTtl: 30 })
    expect(env.EMAIL_MESSAGES.put).toHaveBeenCalledTimes(2)
  })

  it('blocks expired values even if KV still returns a cached record', async () => {
    const env = { EMAIL_MESSAGES: mockEmailStorage() }
    const { token, key } = await storeEmailBody(env, 'Secret expired body')
    env.EMAIL_MESSAGES.values.get(key).expiresAt = Date.now() - 1
    const response = await worker.fetch(request(token), env)
    expect(response.status).toBe(410)
    expect(await response.text()).not.toContain('Secret expired body')
  })

  it('offers a retry for a new key not yet visible in this region', async () => {
    const env = { EMAIL_MESSAGES: mockEmailStorage() }
    const response = await worker.fetch(request('a'.repeat(22)), env)
    expect(response.status).toBe(404)
    expect(response.headers.get('Retry-After')).toBe('30')
    expect((await response.json()).error).toContain('wait a minute and retry')
  })

  it('rejects malformed tokens, oversized requests, GET URLs and foreign origins before a KV read', async () => {
    const env = { EMAIL_MESSAGES: mockEmailStorage() }
    for (const input of [request('bad'), request('a'.repeat(10000)),
      new Request('https://phishhook.lol/api/email-message?token=' + 'a'.repeat(22)),
      request('a'.repeat(22), { headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' } })]) {
      expect((await worker.fetch(input, env)).status).toBeGreaterThanOrEqual(400)
    }
    expect(env.EMAIL_MESSAGES.get).not.toHaveBeenCalled()
  })

  it('does not log keys, values or exceptions on storage failures', async () => {
    const env = { EMAIL_MESSAGES: mockEmailStorage() }
    env.EMAIL_MESSAGES.get.mockRejectedValue(new Error('Private contents and address'))
    const error = vi.spyOn(console, 'error')
    const response = await worker.fetch(request('a'.repeat(22)), env)
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('Private')
    expect(error).not.toHaveBeenCalled()
  })

  it('rejects unsafe expiry and message sizes instead of retaining or truncating them', async () => {
    const storage = mockEmailStorage()
    for (const ttl of ['0', 'not-a-number', '604801']) {
      await expect(storeEmailBody({ EMAIL_MESSAGES: storage, EMAIL_TTL_SECONDS: ttl }, 'Message')).rejects.toThrow()
    }
    await expect(storeEmailBody({ EMAIL_MESSAGES: storage }, 'x'.repeat(5001))).rejects.toThrow()
    expect(storage.put).not.toHaveBeenCalled()
  })
})

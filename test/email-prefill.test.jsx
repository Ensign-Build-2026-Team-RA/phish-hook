// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../phish-hook/src/App.tsx'
import { createAnalysisLink, createTokenAnalysisLink } from '../shared/analysis-link.ts'
import { storeEmailBody, retrieveEmailBody } from '../src/email-storage.js'
import { mockEmailStorage } from './email-storage.mock.js'

let root
let container
const sample = 'Urgent: verify your account before it is suspended. ✓'

async function mount(fragment) {
  globalThis.window.history.replaceState(null, '', '/' + fragment)
  container = globalThis.document.createElement('div')
  globalThis.document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
}

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  container?.remove()
  globalThis.window.localStorage.clear()
  vi.unstubAllGlobals()
  root = null
})

describe('email imports in the existing Analyze page', () => {
  it('retrieves a short token link into the existing textarea without running AI or browser storage', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const env = { EMAIL_MESSAGES: mockEmailStorage(), AI: { run: vi.fn() } }
    const { token } = await storeEmailBody(env, sample)
    const fetch = vi.fn(async (url, options) => retrieveEmailBody(new Request('https://phishhook.lol' + url, options), env))
    vi.stubGlobal('fetch', fetch)
    await mount(new URL(createTokenAnalysisLink('https://phishhook.lol/', token)).hash)
    await act(async () => { await fetch.mock.results[0].value })
    expect(container.querySelector('textarea').value).toBe(sample)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('/api/email-message')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token })
    expect(fetch.mock.calls[0][1].cache).toBe('no-store')
    expect(env.AI.run).not.toHaveBeenCalled()
    expect(globalThis.window.location.hash).toBe('')
    expect(globalThis.window.localStorage.getItem('phish-hook-draft')).toBeNull()
    expect(globalThis.window.localStorage.getItem('phish-hook-history')).not.toContain(sample)
  })

  it('allows a retry after propagation delay without an automatic analysis', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: 'Wait a minute and retry.' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ message: sample }))
    vi.stubGlobal('fetch', fetch)
    await mount('#analyze?t=' + 'a'.repeat(22))
    expect(container.querySelector('textarea').value).toBe('')
    expect(container.querySelector('[role="alert"]').textContent).toContain('Wait a minute')
    const retry = [...container.querySelectorAll('button')].find(button => button.textContent === 'Retry loading email')
    await act(async () => retry.click())
    expect(container.querySelector('textarea').value).toBe(sample)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.every(([url]) => url === '/api/email-message')).toBe(true)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('reports expired or damaged token links without partial prefills', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const fetch = vi.fn().mockResolvedValue(Response.json({ error: 'This email link has expired.' }, { status: 410 }))
    vi.stubGlobal('fetch', fetch)
    await mount('#analyze?t=' + 'a'.repeat(22))
    expect(container.querySelector('[role="alert"]').textContent).toContain('expired')
    expect(container.querySelector('textarea').value).toBe('')
    await act(async () => {
      globalThis.window.history.replaceState(null, '', '/#analyze?t=bad')
      globalThis.window.dispatchEvent(new globalThis.window.HashChangeEvent('hashchange'))
    })
    expect(container.querySelector('[role="alert"]').textContent).toContain('damaged')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('aborts an old token request so it cannot overwrite a later imported message', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    let resolveOld
    const fetch = vi.fn(() => new Promise(resolve => { resolveOld = resolve }))
    vi.stubGlobal('fetch', fetch)
    await mount('#analyze?t=' + 'a'.repeat(22))
    expect(container.querySelector('textarea').disabled).toBe(true)
    await act(async () => {
      globalThis.window.history.replaceState(null, '', '/' + new URL(createAnalysisLink('https://phishhook.lol/', sample)).hash)
      globalThis.window.dispatchEvent(new globalThis.window.HashChangeEvent('hashchange'))
    })
    await act(async () => resolveOld(Response.json({ message: 'Stale body' })))
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    expect(container.querySelector('textarea').value).toBe(sample)
    expect(container.querySelector('textarea').disabled).toBe(false)
  })

  it('prefills the textarea, removes the fragment, stores no email content, and waits for a click', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ analysis: {
      score: 95, level: 'High', summary: 'Suspicious request', flags: ['Urgency'], advice: 'Do not click.',
    } }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await mount(new URL(createAnalysisLink('https://phishhook.lol/', sample)).hash)
    expect(container.querySelector('textarea').value).toBe(sample)
    expect(globalThis.window.location.hash).toBe('')
    expect(globalThis.window.localStorage.getItem('phish-hook-draft')).toBeNull()
    expect(globalThis.window.localStorage.getItem('phish-hook-history')).not.toContain(sample)
    expect(fetch).not.toHaveBeenCalled()
    const button = [...container.querySelectorAll('button')].find(button => button.textContent === 'Analyze with Cloudflare AI')
    await act(async () => button.click())
    expect(fetch).toHaveBeenCalledOnce()
    expect(JSON.parse(fetch.mock.calls[0][1].body).text).toBe(sample)
    expect(globalThis.window.localStorage.getItem('phish-hook-draft')).toBeNull()
    expect(globalThis.window.localStorage.getItem('phish-hook-history')).not.toContain(sample)
  })

  it('imports a later fragment without automatically submitting or persisting it', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await mount('')
    await act(async () => {
      globalThis.window.history.replaceState(null, '', '/' + new URL(createAnalysisLink('https://phishhook.lol/', sample)).hash)
      globalThis.window.dispatchEvent(new globalThis.window.HashChangeEvent('hashchange'))
    })
    expect(container.querySelector('textarea').value).toBe(sample)
    expect(globalThis.window.localStorage.getItem('phish-hook-draft')).not.toContain(sample)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('opens the existing Analyze page for the normal fallback link', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    await mount('#analyze')
    expect(container.querySelector('textarea').value).toBe('')
    expect(container.textContent).toContain('Safety Report')
  })

  it('shows the raw failed AI response without persisting the imported email', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'Workers AI returned a response the analyzer could not parse.',
      model: 'test-model',
      rawModelResponse: { choices: [{ message: { content: 'Invalid analysis returned by model' } }] },
    }), { status: 502 })))
    await mount(new URL(createAnalysisLink('https://phishhook.lol/', sample)).hash)
    const button = [...container.querySelectorAll('button')].find(button => button.textContent === 'Analyze with Cloudflare AI')
    await act(async () => button.click())
    expect(container.textContent).toContain('Invalid analysis returned by model')
    expect(container.textContent).toContain('test-model')
    expect(container.querySelector('[role="alert"]').textContent).toContain('could not parse')
    expect(globalThis.window.localStorage.getItem('phish-hook-draft')).toBeNull()
    expect(globalThis.window.localStorage.getItem('phish-hook-history')).not.toContain(sample)
  })
})

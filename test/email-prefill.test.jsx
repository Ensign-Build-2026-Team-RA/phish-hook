// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../phish-hook/src/App.tsx'
import { createAnalysisLink } from '../shared/analysis-link.ts'

let root
let container
const sample = 'Urgent: verify your account before it is suspended. ✓'

async function mount(fragment) {
  globalThis.window.history.replaceState(null, '', '/' + fragment)
  container = globalThis.document.createElement('div')
  globalThis.document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root.render(createElement(App)))
}

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  container?.remove()
  globalThis.window.localStorage.clear()
  vi.unstubAllGlobals()
  root = null
})

describe('email imports in the existing Analyze page', () => {
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
})

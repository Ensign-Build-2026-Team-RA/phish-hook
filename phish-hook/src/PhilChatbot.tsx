import { useEffect, useRef, useState } from 'react'
import './PhilChatbot.css'

type Message = { role: 'user' | 'assistant'; content: string }
const WELCOME = "Something smells phishy! 🕵️ I'm Detective Phil. Ask me about suspicious messages or staying safe online."

export default function PhilChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = input.trim()
    if (!message || busy) return
    const previous = messages.filter((m, i) => i !== 0).slice(-8)
    setMessages((old) => [...old, { role: 'user', content: message }])
    setInput('')
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: previous }),
      })
      const data: { reply?: string; error?: string } = await response.json()
      if (!response.ok || !data.reply) throw new Error(data.error || 'Could not get a reply.')
      setMessages((old) => [...old, { role: 'assistant', content: data.reply! }])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="phil-widget">
      {open && <section className="phil-panel" aria-label="Chat with Detective Phil">
        <header className="phil-header">
          <img src="/phil-detective.png" alt="Detective Phil" />
          <div><strong>Ask Detective Phil</strong><span>AI phishing-awareness assistant</span></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close Phil chat">×</button>
        </header>
        <div className="phil-messages" aria-live="polite">
          {messages.map((m, i) => <div key={i} className={`phil-message phil-${m.role}`}>{m.content}</div>)}
          {busy && <div className="phil-message phil-assistant">Phil is investigating…</div>}
          {error && <p className="phil-error" role="alert">{error}</p>}
          <div ref={endRef} />
        </div>
        <form className="phil-form" onSubmit={send}>
          <input aria-label="Message Detective Phil" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1200} placeholder="Ask Phil a question…" />
          <button type="submit" disabled={busy || !input.trim()}>Send</button>
        </form>
        <p className="phil-privacy">AI can make mistakes. Don't share passwords or verification codes. Chat stays in this page until you reload.</p>
      </section>}
      <button className="phil-launcher" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close Detective Phil' : 'Chat with Detective Phil'} aria-expanded={open}>
        <img src="/phil-detective.png" alt="" /><span>{open ? 'Close Phil' : 'Ask Phil'}</span>
      </button>
    </div>
  )
}

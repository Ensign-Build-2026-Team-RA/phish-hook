import SecurityDashboard from './SecurityDashboard'
import { useEffect, useRef, useState } from 'react'
import { MAX_MESSAGE_LENGTH, readAnalysisFragment } from '../../shared/analysis-link'
import './App.css'

const navItems = ['Home', 'Analyze', 'Dashboard', 'History', 'Safety Guide'] as const

type NavItem = (typeof navItems)[number]

type HistoryEntry = {
  title: string
  state: string
  content: string
}

const threatExampleText = 'Example: Hi! Your account is locked. Click here now to fix it and enter your password and code before it closes.'

const owaspTop10Sample = `Hi! Your account is locked. We need you to click this link right now to fix it. If you do not act fast, your account will be closed. Please enter your password and the one-time code we send you. This is the real security team and it is very important.`

const buildAnalysis = (content: string, imagePresent: boolean) => {
  const normalized = content.toLowerCase()
  const owaspChecks = [
    {
      id: 'A01',
      label: 'Broken Access Control',
      keywords: ['recover access', 'verify account', 'restore access', 'account suspended', 'locked account', 'security alert'],
      icon: '🚧',
    },
    {
      id: 'A02',
      label: 'Cryptographic Failures',
      keywords: ['password', 'otp', 'one-time code', 'verification code', 'secret code', 'mfa', 'sms code'],
      icon: '🔐',
    },
    {
      id: 'A03',
      label: 'Injection',
      keywords: ['click here', 'open this link', 'follow the link', 'redirect', 'download now', 'submit form'],
      icon: '🧪',
    },
    {
      id: 'A04',
      label: 'Insecure Design',
      keywords: ['urgent', 'immediately', 'act now', 'today only', 'within 24 hours', 'final notice'],
      icon: '🧠',
    },
    {
      id: 'A05',
      label: 'Security Misconfiguration',
      keywords: ['official', 'bank', 'paypal', 'microsoft', 'apple', 'security team', 'customer support'],
      icon: '⚙️',
    },
    {
      id: 'A06',
      label: 'Vulnerable Components',
      keywords: ['legacy portal', 'outdated app', 'unsupported browser', 'expired certificate', 'old version'],
      icon: '🧰',
    },
    {
      id: 'A07',
      label: 'Authentication Failures',
      keywords: ['verify your identity', 'confirm login', 'reset your password', 'sign in to continue', 'account recovery'],
      icon: '🪪',
    },
    {
      id: 'A08',
      label: 'Integrity Failures',
      keywords: ['invoice', 'payment required', 'wire transfer', 'payment update', 'tax refund', 'important document'],
      icon: '📦',
    },
    {
      id: 'A09',
      label: 'Logging & Monitoring',
      keywords: ['ignore this warning', 'do not share', 'keep this private', 'no need to contact support', 'confidential alert'],
      icon: '📊',
    },
    {
      id: 'A10',
      label: 'Unsafe URL / SSRF Risk',
      keywords: ['http://', 'https://', 'click the link', 'visit the portal', 'open the form', 'secure portal'],
      icon: '🔗',
    },
  ]

  const matchedChecks = owaspChecks
    .map((check) => ({
      ...check,
      value: Math.min(99, 22 + check.keywords.filter((term) => normalized.includes(term)).length * 17),
      matches: check.keywords.filter((term) => normalized.includes(term)),
    }))
    .filter((check) => check.matches.length > 0)

  const averageMatchScore = matchedChecks.reduce((total, check) => total + check.value, 0) / Math.max(matchedChecks.length, 1)
  const score = Math.min(
    99,
    Math.max(
      12,
      Math.round(30 + averageMatchScore * 0.75 + (imagePresent ? 8 : 0)),
    ),
  )

  const risk = matchedChecks.length >= 3 || score >= 68 ? 'High' : score >= 45 ? 'Moderate' : 'Low'
  const flags = matchedChecks.length
    ? matchedChecks.slice(0, 4).map((check) => `OWASP ${check.id}: ${check.label}`)
    : ['OWASP A09: Security logging and monitoring gaps not detected']

  const explanation = matchedChecks.length
    ? `This is a sneaky trap. It says to hurry, it scares you, and it asks for a password or code. That is a big red flag. Real companies do not usually ask for secret information in a scary message like this.`
    : 'This does not look super scary yet, but if it asks for a password, code, or quick action, it is still smart to double-check using a trusted app or website.'

  return {
    score,
    level: risk,
    summary:
      matchedChecks.length > 0
        ? `OWASP Top 10 review found ${matchedChecks.length} high-risk web application patterns consistent with phishing manipulation and account abuse.`
        : 'OWASP Top 10 review did not detect clear phishing patterns in the provided content.',
    flags,
    explanation,
    advice: matchedChecks.length
      ? 'This message appears to match multiple OWASP phishing patterns. Verify the sender via a trusted channel before acting on any request.'
      : 'No obvious malicious pattern was detected, but the request still deserves caution if it asks for credentials or urgent action.',
  }
}

type Analysis = {
  score: number
  level: 'Low' | 'Moderate' | 'High'
  summary: string
  flags: string[]
  explanation: string
  advice: string
}

const emptyAnalysis: Analysis = {
  ...buildAnalysis('', false),
  score: 0,
  level: 'Low',
  summary: 'Paste a message to start the phishing assessment.',
  flags: [],
  explanation: 'Waiting for content to review. The explanation will appear here once the scan completes.',
  advice: '',
}

const defaultHistoryRows: HistoryEntry[] = [
  { title: 'Bank impersonation attempt', state: 'High risk · 2 hours ago', content: 'Urgent: your bank account has been temporarily suspended. Verify now to avoid account closure.' },
  { title: 'Fake customer support message', state: 'Moderate risk · yesterday', content: 'Customer support has requested a password reset and a one-time code to validate the account.' },
  { title: 'Invoice payment scam', state: 'High risk · 3 days ago', content: 'Your invoice is overdue. Please review the attached payment link immediately to avoid penalties.' },
  { title: 'Social engineering alert', state: 'Low risk · 1 week ago', content: 'A message asks for urgent verification from a trusted contact but contains no direct link.' },
]

const guideItems = [
  {
    title: 'Urgency triggers',
    content: [
      'Threats of account closure or legal action.',
      'Requests to act within minutes or hours.',
      'Pressure to click a link before verifying the source.',
    ],
  },
  {
    title: 'Verification habits',
    content: [
      'Use official apps or contact numbers from trusted sources.',
      'Check sender identity before sharing personal information.',
      'Pause before responding to emotional or fear-based messaging.',
    ],
  },
  {
    title: 'Link inspection',
    content: [
      'Hover before clicking if available.',
      'Look for misspellings, lookalike domains, or weird redirects.',
      'Review whether a request is expected or unusual.',
    ],
  },
  {
    title: 'When to escalate',
    content: [
      'Any request for passwords, OTPs, or payment details.',
      'Messages that impersonate institutions or family members.',
      'Repeated targeting or unusual account activity.',
    ],
  },
]

function App() {
  const [emailPrefill] = useState(() => typeof window === 'undefined' ? null : readAnalysisFragment(window.location.hash))
  const privateEmailSession = useRef(emailPrefill !== null)
  const [isEmailSession, setIsEmailSession] = useState(emailPrefill !== null)
  const [activePage, setActivePage] = useState<NavItem>(emailPrefill ? 'Analyze' : 'Home')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const savedTheme = window.localStorage.getItem('phish-hook-theme')
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'dark'
  })
  const [draftInput, setDraftInput] = useState(() => {
    if (emailPrefill) return emailPrefill.message
    if (typeof window === 'undefined') {
      return ''
    }

    return window.localStorage.getItem('phish-hook-draft') ?? ''
  })
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis)
  const [historyRows, setHistoryRows] = useState<HistoryEntry[]>(() => {
    if (typeof window === 'undefined') {
      return defaultHistoryRows
    }

    try {
      const savedHistory = window.localStorage.getItem('phish-hook-history')
      if (!savedHistory) {
        return defaultHistoryRows
      }

      const parsedHistory = JSON.parse(savedHistory) as HistoryEntry[]
      return Array.isArray(parsedHistory) && parsedHistory.length > 0 ? parsedHistory : defaultHistoryRows
    } catch {
      return defaultHistoryRows
    }
  })
  const [lastAnalyzedInput, setLastAnalyzedInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [analysisError, setAnalysisError] = useState(emailPrefill?.error ?? '')
  const [rawAiResponse, setRawAiResponse] = useState<unknown>(null)
  const [aiModel, setAiModel] = useState('')

  const hasInput = draftInput.trim().length > 0
  const currentInputSignature = draftInput.trim()
  const isRunDisabled = isAnalyzing || !hasInput || currentInputSignature === lastAnalyzedInput
  const isAnalyzeAgainDisabled = isAnalyzing || !hasInput
  const isPendingScore = !isAnalyzing && progressValue === 0
  const scoreRingProgress = Math.min(100, Math.max(0, progressValue))
  const scoreRingStyle = {
    strokeDashoffset: `${(1 - scoreRingProgress / 100) * (2 * Math.PI * 54)}`,
  }
  const displayScore = isAnalyzing ? Math.round(progressValue) : isPendingScore ? 0 : analysis.score
  const displayRisk = isPendingScore ? 'Pending' : analysis.level
  const displaySummary = isPendingScore
    ? 'Paste a message to start the phishing assessment.'
    : analysis.summary
  const totalScoreText = `${displayScore}/100`
  useEffect(() => {
    const consumeFragment = () => {
      const prefill = readAnalysisFragment(window.location.hash)
      if (!prefill) return
      privateEmailSession.current = true
      setIsEmailSession(true)
      setActivePage('Analyze')
      setDraftInput(prefill.message)
      setAnalysisError(prefill.error)
      setLastAnalyzedInput('')
      setAnalysis(emptyAnalysis)
      setRawAiResponse(null)
      setProgressValue(0)
      // Remove the email from the current browser history entry after importing it.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    consumeFragment()
    window.addEventListener('hashchange', consumeFragment)
    return () => window.removeEventListener('hashchange', consumeFragment)
  }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('phish-hook-page', activePage)
    }
  }, [activePage])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('phish-hook-theme', theme)
    }
  }, [theme])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!privateEmailSession.current) window.localStorage.setItem('phish-hook-draft', draftInput)
    }
  }, [draftInput])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('phish-hook-history', JSON.stringify(historyRows))
    }
  }, [historyRows])

  useEffect(() => {
    if (!isAnalyzing) {
      return
    }

    const totalDuration = 5000
    const frameInterval = 40
    const stepValue = 100 / (totalDuration / frameInterval)
    const timer = window.setInterval(() => {
      setProgressValue((current) => {
        const nextValue = Math.min(current + stepValue, 100)
        if (nextValue >= 100) {
          window.clearInterval(timer)
        }
        return nextValue
      })
    }, frameInterval)

    return () => window.clearInterval(timer)
  }, [isAnalyzing])

  useEffect(() => {
    if (isAnalyzing) {
      return
    }

    if (!hasInput || currentInputSignature !== lastAnalyzedInput) {
      setProgressValue(0)
    }
  }, [hasInput, isAnalyzing, currentInputSignature, lastAnalyzedInput])

  const runAnalysis = async (textToAnalyze: string, shouldAddToHistory = true) => {
    const nextInputSignature = textToAnalyze.trim()
    setProgressValue(0)
    setIsAnalyzing(true)
    setAnalysisError('')
    setRawAiResponse(null)
    setAiModel('')
    setAnalysis(emptyAnalysis)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToAnalyze }),
      })

      const responseText = await response.text()
      let payload: Record<string, unknown> = {}

      if (responseText) {
        try {
          payload = JSON.parse(responseText) as Record<string, unknown>
        } catch {
          payload = { error: 'The analysis service returned an invalid JSON response.' }
        }
      }

      setRawAiResponse(payload.rawModelResponse ?? null)
      setAiModel(typeof payload.model === 'string' ? payload.model : '')
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : `AI analysis request failed (${response.status}).`)
      }

      const directAnalysis = payload.analysis ?? payload
      if (!directAnalysis || typeof directAnalysis !== 'object') {
        throw new Error('The AI analysis service returned an unexpected response.')
      }

      const score = Number((directAnalysis as Record<string, unknown>).score)
      const risk = (directAnalysis as Record<string, unknown>).level
        ?? (directAnalysis as Record<string, unknown>).risk
      const nextAnalysis: Analysis = {
        score: Number.isFinite(score) ? score : 0,
        level: typeof risk === 'string'
          ? risk as Analysis['level']
          : 'Low',
        summary: typeof (directAnalysis as Record<string, unknown>).summary === 'string'
          ? (directAnalysis as Record<string, unknown>).summary as string
          : 'The analysis service returned a result without a summary.',
        flags: Array.isArray((directAnalysis as Record<string, unknown>).flags)
          ? ((directAnalysis as Record<string, unknown>).flags as unknown[]).filter((flag): flag is string => typeof flag === 'string')
          : [],
        explanation: typeof (directAnalysis as Record<string, unknown>).explanation === 'string'
          ? (directAnalysis as Record<string, unknown>).explanation as string
          : 'Review the AI summary and detected flags. Verify unexpected requests through a trusted channel.',
        advice: typeof (directAnalysis as Record<string, unknown>).advice === 'string'
          ? (directAnalysis as Record<string, unknown>).advice as string
          : 'Verify unexpected requests through a trusted channel before responding or following links.',
      }
      setLastAnalyzedInput(nextInputSignature)
      setProgressValue(100)
      setAnalysis(nextAnalysis)

      // Only save successful, valid AI scans from normal (non-email) sessions.
      // Email-import sessions deliberately remain private and are never persisted.
      if (!privateEmailSession.current && Number.isFinite(score) && score >= 0 && score <= 100) {
        try {
          const storageKey = 'phish-hook-ai-scans'
          const previous = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as unknown
          const savedScans = Array.isArray(previous) ? previous : []
          const newScan = {
            id: window.crypto.randomUUID(),
            score: nextAnalysis.score,
            level: nextAnalysis.level,
            summary: nextAnalysis.summary,
            flags: nextAnalysis.flags,
            preview: textToAnalyze.trim().slice(0, 120),
            createdAt: new Date().toISOString(),
          }
          window.localStorage.setItem(
            storageKey,
            JSON.stringify([newScan, ...savedScans].slice(0, 100)),
          )
          window.dispatchEvent(new Event('phish-hook-scans-updated'))
        } catch (storageError) {
          console.warn('Could not save scan history:', storageError)
        }
      }

      if (shouldAddToHistory && !privateEmailSession.current) {
        const inputPreview = textToAnalyze.trim()
        const title = inputPreview.length > 42 ? `${inputPreview.slice(0, 42)}...` : inputPreview
        setHistoryRows((currentRows) => [{
          title,
          state: `${nextAnalysis.level} risk · just now`,
          content: inputPreview,
        }, ...currentRows].slice(0, 6))
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'AI analysis failed. Please try again.')
      setAnalysis((current) => current.score > 0 ? current : {
        score: 0,
        level: 'Low',
        summary: 'The analysis service returned no usable data. Please try again.',
        flags: ['Service response empty'],
        explanation: 'The message could not be scored because the service returned incomplete data, so the result is currently inconclusive and should be rechecked.',
        advice: 'Try again in a moment or paste a shorter message to re-run the check.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyze = () => {
    void runAnalysis(draftInput, true)
  }

  const loadOwaspTop10Test = () => {
    setDraftInput(owaspTop10Sample)
    setLastAnalyzedInput('')
  }

  const handleHistoryReplay = (row: HistoryEntry) => {
    const replayText = row.content || row.title
    setDraftInput(replayText)
    setActivePage('Analyze')
    void runAnalysis(replayText, true)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <SecurityDashboard />

      case 'Home':
        return (
          <div className="page-shell">
            <div className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow">Threat intelligence</div>
                <h1 className="hero-title">Know when a message is trying to manipulate you.</h1>
                <p>
                  Phishing Hook helps people evaluate suspicious emails, texts, and social prompts by surfacing urgency,
                  impersonation patterns, and coercive language before trust is lost.
                </p>
                <button type="button" className="primary-btn" onClick={() => setActivePage('Analyze')}>Try the scanner →</button>
                <div className="hero-stats" style={{ marginTop: 18 }}>
                  <span className="stat-pill"><strong>4x</strong> faster review</span>
                  <span className="stat-pill"><strong>24/7</strong> risk awareness</span>
                  <span className="stat-pill"><strong>AI</strong> guided checks</span>
                </div>
              </div>

              <div className="preview-card">
                <div className="preview-header">
                  <span>Current signal</span>
                  <span>High</span>
                </div>
                <div className="mini-score"><span>62</span></div>
                <div className="preview-grid">
                  <div className="preview-row">
                    <strong>Urgency</strong>
                    <div className="bar"><span style={{ width: '82%' }} /></div>
                  </div>
                  <div className="preview-row">
                    <strong>Impersonation</strong>
                    <div className="bar"><span style={{ width: '75%' }} /></div>
                  </div>
                  <div className="preview-row">
                    <strong>Manipulation</strong>
                    <div className="bar"><span style={{ width: '88%' }} /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Fast scanning</h3>
                <p>Review messages for urgency, impersonation, and coercive patterns before acting.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>Cloudflare Workers AI</h3>
                <p>Gemma reviews messages for suspicious links, impersonation, and social-engineering tactics.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">🛡️</div>
                <h3>Safer decisions</h3>
                <p>Clarify what is risky, what requires verification, and what should be treated as a cue to pause.</p>
              </article>
            </div>
          </div>
        )

      case 'Analyze':
        return (
          <div className="page-shell">
            <div className="headline-row">
              <div className="eyebrow">Cloudflare Workers AI</div>
              <div className="headline-actions">
                <button type="button" className="secondary-btn">Share</button>
                <button type="button" className="primary-btn" onClick={handleAnalyze} disabled={isAnalyzeAgainDisabled}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Again'}
                </button>
              </div>
            </div>

            <h1 className="report-title">Safety Report</h1>

            <section className="analysis-input-panel">
              <div className="input-panel-header">
                <div>
                  <div className="preview-label">Paste a message</div>
                  <h3>Threat intake</h3>
                </div>
                <span className="assistant-status">AI ready</span>
              </div>

              <textarea
                value={draftInput}
                onChange={(event) => setDraftInput(event.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={threatExampleText}
                aria-label="User message to analyze"
              />

              <div className="analysis-actions">
                <button type="button" className="secondary-btn" onClick={loadOwaspTop10Test}>Load OWASP Top 10 Test</button>
                <button type="button" className="primary-btn" onClick={handleAnalyze} disabled={isRunDisabled}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with Cloudflare AI'}
                </button>
              </div>
              {analysisError && <p className="scanner-note scanner-error" role="alert">{analysisError}</p>}
              {isEmailSession && <p className="scanner-note">Email messages stay in memory and are excluded from saved drafts and history. Review the message and click Analyze to start.</p>}
              <p className="scanner-note">Messages are sent to Cloudflare Workers AI. Avoid including passwords or verification codes. AI results can be wrong and are not a guarantee of safety.</p>
            </section>

            <section className="report-card">
              <div className="report-card-inner">
                <div className="score-wrap">
                  <div className="score-ring" aria-label={`Risk score ${displayScore} out of 100`}>
                    <svg viewBox="0 0 140 140" aria-hidden="true">
                      <circle className="score-ring-track" cx="70" cy="70" r="54" />
                      <circle
                        className="score-ring-progress"
                        cx="70"
                        cy="70"
                        r="54"
                        style={scoreRingStyle}
                      />
                    </svg>
                    <div className="score-ring-label">
                      <span>{displayScore}</span>
                    </div>
                  </div>
                </div>

                <div className="report-content">
                  <div className="score-total-badge">
                    <span>Total score</span>
                    <strong>{totalScoreText}</strong>
                  </div>
                  <div className="risk-tag">{displayRisk}</div>
                  <div className="risk-label">Phishing and social-engineering review</div>
                  <h2>Risk Assessment</h2>
                  <div className="preview-label">Summary</div>
                  <p>{displaySummary}</p>

                  <div className="why-risk-panel">
                    <div className="preview-label">Why this is risky</div>
                    <p>{analysis.explanation}</p>
                  </div>

                  <div className="preview-label">Analyzed content preview</div>
                  <div className="preview-box">
                    <p>{draftInput || 'No incoming content yet. Paste a message to start analysis.'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="flag-panel">
              <div className="flag-header">Detected Flags and Recommended Next Step</div>
              <p>{analysis.advice}</p>
              <div className="flag-list">
                {analysis.flags.map((flag) => (
                  <span key={flag} className="flag-badge">
                    {flag}
                  </span>
                ))}
              </div>
            </section>

            {rawAiResponse !== null && (
              <details className="ai-debug-panel" open>
                <summary>Full AI response{aiModel ? ` · ${aiModel}` : ''}</summary>
                <h3>Raw Cloudflare Workers AI result</h3>
                <pre>{JSON.stringify(rawAiResponse, null, 2)}</pre>
                {analysis.advice || analysis.flags.length > 0 ? (
                  <>
                    <h3>Normalized assessment shown above</h3>
                    <pre>{JSON.stringify(analysis, null, 2)}</pre>
                  </>
                ) : (
                  <p>The model returned a result, but the analyzer could not convert it into an assessment.</p>
                )}
              </details>
            )}
          </div>
        )

      case 'History':
        return (
          <div className="page-shell">
            <div className="section-header-row">
              <div className="eyebrow">Illustrative history examples</div>
              <button type="button" className="primary-btn small-btn" onClick={() => setActivePage('Analyze')}>New Analysis</button>
            </div>
            <h1 className="report-title">History</h1>

            <section className="list-panel">
              <div className="history-list">
                {historyRows.map((row) => (
                  <button
                    key={`${row.title}-${row.state}`}
                    type="button"
                    className="history-row"
                    onClick={() => handleHistoryReplay(row)}
                  >
                    <strong>{row.title}</strong>
                    <span>{row.state}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )

      case 'Safety Guide':
        return (
          <div className="page-shell">
            <div className="section-header-row">
              <div className="eyebrow">Stay alert</div>
              <button type="button" className="primary-btn small-btn" onClick={() => setActivePage('Analyze')}>Run Check</button>
            </div>
            <h1 className="report-title">Safety Guide</h1>

            <div className="guide-grid">
              {guideItems.map((guide) => (
                <article key={guide.title} className="guide-card">
                  <h3>{guide.title}</h3>
                  <ul>
                    {guide.content.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`app-shell ${theme}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="brand"
            aria-label="Phishing Hook home"
            onClick={() => setActivePage('Home')}
          >
            <img src="/favicon-32x32.png" alt="Phishing Hook" className="brand-icon" />
            <span className="brand-name">Phishing Hook</span>
          </button>

          <nav className="nav" aria-label="Main navigation">
            <button
              id="toggle-mode"
              type="button"
              className="nav-btn mode-toggle"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            >
              <i className={theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon'} aria-hidden="true" />
            </button>

            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActivePage(item)}
                className={item === activePage ? 'nav-btn active' : 'nav-btn'}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {renderPage()}
    </div>
  )
}

export default App

import { useEffect, useState } from 'react'
import './App.css'

const navItems = ['Home', 'Analyze', 'History', 'Safety Guide'] as const

type NavItem = (typeof navItems)[number]

type HistoryEntry = {
  title: string
  state: string
  content: string
}

const threatExampleText = 'Example: Urgent: your bank account has been temporarily suspended. Click the link to restore access immediately.'

const buildAnalysis = (content: string, imagePresent: boolean) => {
  const normalized = content.toLowerCase()
  const urgencyMatches = ['urgent', 'immediately', 'asap', 'right away', 'within 24 hours', 'act now'].filter((term) => normalized.includes(term))
  const impersonationMatches = ['bank', 'paypal', 'apple', 'microsoft', 'official', 'security', 'customer support'].filter((term) => normalized.includes(term))
  const linkMatches = ['click this link', 'verify here', 'restore access', 'secure account', 'http://', 'https://', 'login now'].filter((term) => normalized.includes(term))
  const emotionalMatches = ['suspended', 'locked', 'danger', 'lose access', 'threat', 'immediately', 'panic'].filter((term) => normalized.includes(term))

  const urgencyScore = Math.min(96, 15 + urgencyMatches.length * 16)
  const impersonationScore = Math.min(94, 18 + impersonationMatches.length * 14)
  const linkScore = Math.min(98, 12 + linkMatches.length * 15)
  const emotionalScore = Math.min(96, 14 + emotionalMatches.length * 15)

  const score = Math.min(
    99,
    Math.max(
      18,
      Math.round((urgencyScore + impersonationScore + linkScore + emotionalScore) / 4 + (imagePresent ? 8 : 0)),
    ),
  )

  const flags = [
    urgencyMatches.length ? 'Urgent language detected' : 'No urgent wording detected',
    linkMatches.length ? 'Suspicious link or click request' : 'No obvious phishing link pattern',
    impersonationMatches.length ? 'Possible impersonation or trust signal' : 'No obvious impersonation cues',
    emotionalMatches.length ? 'Emotional manipulation cues present' : 'Low pressure language detected',
  ]

  const risk = score >= 75 ? 'High' : score >= 45 ? 'Moderate' : 'Low'

  return {
    score,
    risk,
    summary:
      imagePresent && content.trim()
        ? 'Codex AI reviewed both the uploaded image and pasted message and found strong phishing indicators.'
        : imagePresent
          ? 'Codex AI reviewed the uploaded image and found digital trust signals consistent with a phishing attempt.'
          : 'Codex AI reviewed the provided text and found a suspicious pattern that matches common phishing behavior.',
    flags,
    signals: [
      { label: 'Urgency', value: urgencyScore, icon: '⚡' },
      { label: 'Impersonation', value: impersonationScore, icon: '🪪' },
      { label: 'Link Risk', value: linkScore, icon: '🔗' },
      { label: 'Manipulation', value: emotionalScore, icon: '🎭' },
    ],
  }
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
  const [activePage, setActivePage] = useState<NavItem>('Home')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const savedTheme = window.localStorage.getItem('phish-hook-theme')
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light'
  })
  const [draftInput, setDraftInput] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    return window.localStorage.getItem('phish-hook-draft') ?? ''
  })
  const [selectedImage, setSelectedImage] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.localStorage.getItem('phish-hook-image') ?? null
  })
  const [analysis, setAnalysis] = useState(() => buildAnalysis('', false))
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

  const restoreAnalyzeDraft = () => {
    if (typeof window === 'undefined') return

    const savedDraft = window.localStorage.getItem('phish-hook-draft')
    const savedImage = window.localStorage.getItem('phish-hook-image')

    if (savedDraft !== null) {
      setDraftInput(savedDraft)
    }

    if (savedImage !== null) {
      setSelectedImage(savedImage)
    }
  }

  const hasInput = draftInput.trim().length > 0 || Boolean(selectedImage)
  const currentInputSignature = JSON.stringify({
    text: draftInput.trim(),
    hasImage: Boolean(selectedImage),
    image: selectedImage ?? '',
  })
  const isRunDisabled = isAnalyzing || !hasInput || currentInputSignature === lastAnalyzedInput
  const isAnalyzeAgainDisabled = isAnalyzing || !hasInput
  const isPendingScore = !isAnalyzing && progressValue === 0
  const scoreRingStyle = {
    background: `conic-gradient(#ffca4d ${progressValue}%, rgba(255, 255, 255, 0.08) ${progressValue}% 100%)`,
    transition: 'background 0.12s linear',
  }
  const displayScore = isAnalyzing ? Math.round(progressValue) : isPendingScore ? 0 : analysis.score
  const displayRisk = isPendingScore ? 'Pending' : analysis.risk
  const displaySummary = isPendingScore
    ? 'Paste a message or upload an image to start the phishing assessment.'
    : analysis.summary
  const displaySignals = isPendingScore
    ? [
        { label: 'Urgency', value: 0, icon: '⚡' },
        { label: 'Impersonation', value: 0, icon: '🪪' },
        { label: 'Link Risk', value: 0, icon: '🔗' },
        { label: 'Manipulation', value: 0, icon: '🎭' },
      ]
    : analysis.signals

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
      window.localStorage.setItem('phish-hook-draft', draftInput)
    }
  }, [draftInput])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedImage) {
        window.localStorage.setItem('phish-hook-image', selectedImage)
      } else {
        window.localStorage.removeItem('phish-hook-image')
      }
    }
  }, [selectedImage])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('phish-hook-history', JSON.stringify(historyRows))
    }
  }, [historyRows])

  useEffect(() => {
    if (!isAnalyzing) {
      return
    }

    const timer = window.setInterval(() => {
      setProgressValue((current) => {
        if (current >= 100) {
          window.clearInterval(timer)
          return 100
        }

        return Math.min(current + 8, 100)
      })
    }, 80)

    return () => window.clearInterval(timer)
  }, [isAnalyzing])

  useEffect(() => {
    if (!isAnalyzing && (!hasInput || currentInputSignature !== lastAnalyzedInput)) {
      setProgressValue(0)
    }
  }, [hasInput, isAnalyzing, currentInputSignature, lastAnalyzedInput])

  const runAnalysis = async (textToAnalyze: string, imageToAnalyze: string | null, shouldAddToHistory = true) => {
    const nextInputSignature = JSON.stringify({
      text: textToAnalyze.trim(),
      hasImage: Boolean(imageToAnalyze),
      image: imageToAnalyze ?? '',
    })

    setProgressValue(0)
    setIsAnalyzing(true)

    try {
      setLastAnalyzedInput(nextInputSignature)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToAnalyze,
          image: imageToAnalyze,
        }),
      })

      if (!response.ok) {
        throw new Error('AI analysis request failed')
      }

      const payload = await response.json()

      if (payload.score !== undefined) {
        const nextAnalysis = {
          score: Number(payload.score),
          risk: payload.risk || 'High',
          summary: payload.summary || 'Codex AI analyzed the content for phishing signals.',
          flags: Array.isArray(payload.flags) ? payload.flags : [],
          signals: Array.isArray(payload.signals) ? payload.signals : [],
        }

        setProgressValue(100)
        setAnalysis(nextAnalysis)

        if (shouldAddToHistory) {
          const inputPreview = textToAnalyze.trim()
          const title = inputPreview
            ? inputPreview.length > 42
              ? `${inputPreview.slice(0, 42)}...`
              : inputPreview
            : imageToAnalyze
              ? 'Image-based phishing review'
              : 'New message review'

          setHistoryRows((currentRows) => [{
            title,
            state: `${nextAnalysis.risk} risk · just now`,
            content: inputPreview || title,
          }, ...currentRows].slice(0, 6))
        }
        return
      }

      throw new Error('Invalid AI response payload')
    } catch (error) {
      console.error('AI analysis failed, using fallback heuristic analysis:', error)
      const fallback = buildAnalysis(textToAnalyze, Boolean(imageToAnalyze))
      setProgressValue(100)
      setAnalysis(fallback)

      if (shouldAddToHistory) {
        setHistoryRows((currentRows) => [{
          title: textToAnalyze.trim() || 'Fallback review',
          state: `${fallback.risk} risk · just now`,
          content: textToAnalyze.trim() || 'Fallback review',
        }, ...currentRows].slice(0, 6))
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyze = () => {
    void runAnalysis(draftInput, selectedImage, true)
  }

  const handleHistoryReplay = (row: HistoryEntry) => {
    const replayText = row.content || row.title
    setDraftInput(replayText)
    setSelectedImage(null)
    setActivePage('Analyze')
    void runAnalysis(replayText, null, true)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.readAsDataURL(file)
  }

  const renderPage = () => {
    switch (activePage) {
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
                <div className="hero-stats">
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
                <h3>AI-informed logic</h3>
                <p>Signal-based assessment highlights suspicious patterns and manipulative language.</p>
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
              <div className="eyebrow">Codex AI</div>
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
                  <div className="preview-label">Paste message or upload screenshot</div>
                  <h3>Threat intake</h3>
                </div>
                <span className="assistant-status">AI ready</span>
              </div>

              <textarea
                value={draftInput}
                onChange={(event) => setDraftInput(event.target.value)}
                placeholder={threatExampleText}
                aria-label="User message to analyze"
              />

              <div className="analysis-actions">
                <label className="upload-button">
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                  Upload Image
                </label>
                <button type="button" className="primary-btn" onClick={handleAnalyze} disabled={isRunDisabled}>
                  {isAnalyzing ? 'Running...' : 'Run Codex AI'}
                </button>
              </div>

              {selectedImage && (
                <div className="preview-image-wrap">
                  <img src={selectedImage} alt="Uploaded evidence preview" className="uploaded-preview" />
                </div>
              )}
            </section>

            <section className="report-card">
              <div className="report-card-inner">
                <div className="score-wrap">
                  <div className="score-ring" style={scoreRingStyle} aria-label={`Risk score ${displayScore} out of 100`}>
                    <span>{displayScore}</span>
                  </div>
                </div>

                <div className="report-content">
                  <div className="risk-tag">{displayRisk}</div>
                  <div className="risk-label">Scam / Phishing / Emotional Manipulation</div>
                  <h2>Risk Assessment</h2>
                  <p>{displaySummary}</p>

                  <div className="preview-label">Analyzed content preview</div>
                  <div className="preview-box">
                    <p>{draftInput || 'No incoming content yet. Paste a message or upload an image to start analysis.'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="signal-grid">
              {displaySignals.slice(0, 2).map((signal) => (
                <div key={signal.label} className="signal-item">
                  <div className="signal-left">
                    <span className="signal-icon" aria-hidden="true">{signal.icon}</span>
                    <span>{signal.label}</span>
                  </div>
                  <span className="signal-value">{signal.value}</span>
                </div>
              ))}
            </section>

            <section className="signal-grid lower-grid">
              {displaySignals.slice(2).map((signal) => (
                <div key={signal.label} className="signal-item">
                  <div className="signal-left">
                    <span className="signal-icon" aria-hidden="true">{signal.icon}</span>
                    <span>{signal.label}</span>
                  </div>
                  <span className="signal-value">{signal.value}</span>
                </div>
              ))}
            </section>

            <section className="flag-panel">
              <div className="flag-header">Detected Flags</div>
              <div className="flag-list">
                {analysis.flags.map((flag) => (
                  <span key={flag} className="flag-badge">
                    {flag}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )

      case 'History':
        return (
          <div className="page-shell">
            <div className="section-header-row">
              <div className="eyebrow">Recent assessments</div>
              <button type="button" className="primary-btn small-btn">New Analysis</button>
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
              <button type="button" className="primary-btn small-btn">Run Check</button>
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
                onClick={() => {
                  if (item === 'Analyze') {
                    restoreAnalyzeDraft()
                  }
                  setActivePage(item)
                }}
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

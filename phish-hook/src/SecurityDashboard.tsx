import { useEffect, useState } from 'react'
import './SecurityDashboard.css'

export type SavedScan = {
  id: string
  score: number
  level: 'Low' | 'Moderate' | 'High'
  summary: string
  flags: string[]
  preview: string
  createdAt: string
}

const STORAGE_KEY = 'phish-hook-ai-scans'
const MAX_SCANS = 100

function readScans(): SavedScan[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is SavedScan => {
      if (!item || typeof item !== 'object') return false
      const scan = item as Record<string, unknown>
      return typeof scan.id === 'string' &&
        typeof scan.score === 'number' && Number.isFinite(scan.score) &&
        scan.score >= 0 && scan.score <= 100 &&
        (scan.level === 'Low' || scan.level === 'Moderate' || scan.level === 'High') &&
        typeof scan.summary === 'string' &&
        typeof scan.preview === 'string' &&
        typeof scan.createdAt === 'string' &&
        Array.isArray(scan.flags)
    }).slice(0, MAX_SCANS)
  } catch {
    return []
  }
}

function countFlags(scans: SavedScan[], words: string[]): number {
  return scans.reduce((total, scan) => total + scan.flags.filter((flag) =>
    words.some((word) => flag.toLowerCase().includes(word))
  ).length, 0)
}

export default function SecurityDashboard() {
  const [scans, setScans] = useState<SavedScan[]>(readScans)

  useEffect(() => {
    const refresh = () => setScans(readScans())
    window.addEventListener('storage', refresh)
    window.addEventListener('phish-hook-scans-updated', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('phish-hook-scans-updated', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const total = scans.length
  const high = scans.filter((scan) => scan.level === 'High').length
  const moderate = scans.filter((scan) => scan.level === 'Moderate').length
  const low = scans.filter((scan) => scan.level === 'Low').length
  const average = total ? Math.round(scans.reduce((sum, scan) => sum + scan.score, 0) / total) : 0
  const latest = scans[0]
  const circle = 2 * Math.PI * 54
  const recent = scans.slice(0, 20).reverse()
  const points = recent.map((scan, index) => {
    const x = recent.length === 1 ? 200 : (index / (recent.length - 1)) * 400
    const y = 150 - scan.score * 1.4
    return `${x},${y}`
  }).join(' ')
  const links = countFlags(scans, ['link', 'url', 'domain', 'website'])
  const impersonation = countFlags(scans, ['impersonat', 'spoof', 'sender', 'identity'])
  const urgency = countFlags(scans, ['urgent', 'urgency', 'pressure', 'immediate', 'deadline'])

  return (
    <main className="security-dashboard">
      <div className="sd-heading">
        <div>
          <div className="sd-eyebrow">PHISHHOOK / SECURITY CENTER</div>
          <h1>Security Dashboard</h1>
          <p>Real results from completed AI scans in this browser</p>
        </div>
        <span className="sd-demo-badge">● LOCAL SCAN DATA</span>
      </div>

      <div className="sd-main-grid">
        <section className="sd-card">
          <h2>Average Risk Score</h2>
          <div className={`sd-gauge ${average >= 60 ? '' : average >= 25 ? 'sd-blue' : 'sd-green'}`}>
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle className="sd-track" cx="70" cy="70" r="54" />
              <circle className="sd-progress-circle" cx="70" cy="70" r="54"
                strokeDasharray={circle} strokeDashoffset={circle * (1 - average / 100)} />
            </svg>
            <div className="sd-gauge-label">
              <strong>{total ? average : '—'}</strong>
              <span>{total ? 'RISK / 100' : 'NO SCANS'}</span>
            </div>
          </div>
          <p className="sd-note">{total ? `Average across ${total} saved AI scan${total === 1 ? '' : 's'}. Higher means more risk.` : 'Analyze a message to start collecting real results.'}</p>
        </section>

        <section className="sd-card">
          <h2>Completed AI Scans</h2>
          <div className="sd-gauge sd-blue">
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle className="sd-track" cx="70" cy="70" r="54" />
              <circle className="sd-progress-circle" cx="70" cy="70" r="54"
                strokeDasharray={circle} strokeDashoffset={total ? 0 : circle} />
            </svg>
            <div className="sd-gauge-label">
              <strong>{total}</strong>
              <span>AI SCANS</span>
            </div>
          </div>
          <p className="sd-note">{total ? `${high} high-risk detection${high === 1 ? '' : 's'} recorded.` : 'No completed AI scans recorded yet.'}</p>
        </section>

        <section className="sd-card">
          <h2>Detected Risk Levels</h2>
          <div className="sd-threat-list">
            {[
              { name: 'High Risk', count: high, color: '#ff5975', icon: '🔴' },
              { name: 'Moderate Risk', count: moderate, color: '#ffb454', icon: '🟠' },
              { name: 'Low Risk', count: low, color: '#39cfa6', icon: '🟢' },
            ].map((item) => (
              <div className="sd-threat-row" key={item.name}>
                <span className="sd-threat-name"><span>{item.icon}</span> {item.name}</span>
                <strong style={{ color: item.color }}>{item.count}</strong>
              </div>
            ))}
          </div>
          <p className="sd-note">Risk levels returned by completed AI analyses.</p>
        </section>
      </div>

      <div className="sd-bottom-grid">
        <section className="sd-card">
          <h2>AI-Reported Indicators</h2>
          <div className="sd-stats">
            <div><span>Suspicious Links</span><strong>{links}</strong></div>
            <div><span>Impersonation</span><strong>{impersonation}</strong></div>
            <div><span>Urgency Tactics</span><strong>{urgency}</strong></div>
          </div>
          <p className="sd-note">Counts of matching AI flag labels across saved scans, not independently verified link detections.</p>
          <h2 style={{ marginTop: 20 }}>Recent Threats</h2>
          {total === 0 ? (
            <p className="sd-note">No scans yet. Go to Analyze and run a Cloudflare AI check.</p>
          ) : (
            <div className="sd-threat-list">
              {scans.slice(0, 5).map((scan) => (
                <div className="sd-threat-row" key={scan.id}>
                  <span className="sd-threat-name" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <span>{scan.level === 'High' ? '🔴' : scan.level === 'Moderate' ? '🟠' : '🟢'}</span>
                    {' '}{scan.preview.slice(0, 60) || 'Analyzed message'}
                  </span>
                  <strong>{scan.score}/100</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sd-card">
          <h2>Risk Score Trend</h2>
          <p className="sd-note">{total ? `Last ${recent.length} saved AI scan${recent.length === 1 ? '' : 's'}, oldest to newest · 0–100 risk scale` : 'The chart will appear after your first AI scan.'}</p>
          {total > 0 ? (
            <div className="sd-chart">
              <svg viewBox="0 0 400 160" preserveAspectRatio="none" role="img" aria-label="Risk scores of recent completed AI scans">
                <defs>
                  <linearGradient id="sd-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b64dff" stopOpacity=".35" />
                    <stop offset="100%" stopColor="#b64dff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[10, 45, 80, 115, 150].map((y) => (
                  <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="currentColor" opacity=".15" strokeDasharray="4 5" />
                ))}
                {recent.length > 1 && <polygon points={`0,160 ${points} 400,160`} fill="url(#sd-chart-fill)" />}
                <polyline points={points} fill="none" stroke="#c665ff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {recent.length === 1 && <circle cx="200" cy={150 - recent[0].score * 1.4} r="5" fill="#c665ff" />}
              </svg>
            </div>
          ) : (
            <p className="sd-note" style={{ padding: '48px 0', textAlign: 'center' }}>No historical data yet</p>
          )}
          {latest && <p className="sd-note">Latest scan: {latest.level} risk ({latest.score}/100) · {new Date(latest.createdAt).toLocaleString()}</p>}
        </section>
      </div>

      <p className="sd-disclaimer">
        Dashboard shows up to 100 successful AI analyses saved in this browser only. Other users' scans are not included. AI risk scores are indicators, not guarantees of safety. Avoid entering passwords or verification codes.
      </p>
    </main>
  )
}

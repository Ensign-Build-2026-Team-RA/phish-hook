"""Patch the current PhishHook React App.tsx without replacing its UI."""
from pathlib import Path

path = Path('phish-hook/src/App.tsx')
if not path.is_file():
    raise SystemExit('Run this script from the repository root (cannot find phish-hook/src/App.tsx)')
s = path.read_text(encoding='utf-8')

# Use the latest existing code shape and stop rather than corrupt an unfamiliar revision.
needle = "  const [analysis, setAnalysis] = useState(() => buildAnalysis('', false))"
if needle not in s:
    raise SystemExit('App.tsx has changed. Patch not applied; review manually.')
s = s.replace(needle, needle + "\n  const [aiError, setAiError] = useState('')\n  const [aiAdvice, setAiAdvice] = useState('')\n  const [aiVerified, setAiVerified] = useState(false)", 1)

start = s.find('  const runAnalysis = async (')
end = s.find('\n  const handleAnalyze = () => {', start)
if start < 0 or end < 0:
    raise SystemExit('Could not find runAnalysis boundaries. Patch not applied.')
replacement = '''  const runAnalysis = async (textToAnalyze: string, imageToAnalyze: string | null, shouldAddToHistory = true) => {
    const nextInputSignature = JSON.stringify({
      text: textToAnalyze.trim(),
      hasImage: Boolean(imageToAnalyze),
      image: imageToAnalyze ?? '',
    })
    setProgressValue(0)
    setIsAnalyzing(true)
    setAiError('')
    setAiAdvice('')
    setAiVerified(false)

    try {
      if (imageToAnalyze && !textToAnalyze.trim()) {
        throw new Error('Image-only AI analysis is not supported yet. Paste the message text to scan it.')
      }
      if (imageToAnalyze) {
        throw new Error('Screenshot AI analysis is not enabled yet. Paste the text from the screenshot instead.')
      }
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `AI request failed (${response.status})`)
      if (payload.success !== true || payload.source !== 'workers-ai' || !payload.analysis) {
        throw new Error('The server did not confirm a real AI analysis.')
      }
      const result = payload.analysis
      const score = Number(result.score)
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new Error('The AI returned an invalid risk score.')
      }
      const risk = result.level === 'High' || result.level === 'Moderate' || result.level === 'Low'
        ? result.level : score >= 70 ? 'High' : score >= 35 ? 'Moderate' : 'Low'
      const flags: string[] = Array.isArray(result.flags)
        ? result.flags.filter((f: unknown): f is string => typeof f === 'string').slice(0, 6)
        : []
      const nextAnalysis = {
        score,
        risk,
        summary: String(result.summary || 'AI analysis complete.'),
        flags,
        // The model does not provide individual signal percentages; do not invent them.
        signals: [] as { label: string; value: number; icon: string }[],
      }
      setAnalysis(nextAnalysis)
      setAiAdvice(String(result.advice || 'Verify unexpected requests independently.'))
      setAiVerified(true)
      setProgressValue(100)
      setLastAnalyzedInput(nextInputSignature)
      if (shouldAddToHistory) {
        const preview = textToAnalyze.trim()
        setHistoryRows((rows) => [{
          title: preview.length > 42 ? `${preview.slice(0, 42)}...` : preview,
          state: `${risk} risk · AI · just now`,
          content: preview,
        }, ...rows].slice(0, 6))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI analysis failed.'
      setAiError(message)
      setProgressValue(0)
      // Do not display a locally generated score as an AI result.
    } finally {
      setIsAnalyzing(false)
    }
  }
'''
s = s[:start] + replacement + s[end:]

s = s.replace("  const isPendingScore = !isAnalyzing && progressValue === 0", "  const isPendingScore = !isAnalyzing && !aiVerified", 1)
s = s.replace("  const displayScore = isAnalyzing ? Math.round(progressValue) : isPendingScore ? 0 : analysis.score", "  const displayScore = isAnalyzing ? Math.round(progressValue) : isPendingScore ? 0 : analysis.score", 1)
s = s.replace("  const displayRisk = isPendingScore ? 'Pending' : analysis.risk", "  const displayRisk = aiError ? 'AI unavailable' : isPendingScore ? 'Pending' : analysis.risk", 1)
s = s.replace("    ? 'Paste a message or upload an image to start the phishing assessment.'", "    ? (aiError || 'Paste a message to start the AI phishing assessment.')", 1)
s = s.replace('                <span className="assistant-status">AI ready</span>', '                <span className="assistant-status">{aiVerified ? \'AI analysis complete\' : isAnalyzing ? \'AI analyzing...\' : \'AI scan available\'}</span>', 1)
s = s.replace('                  <p>{displaySummary}</p>', '                  <p>{displaySummary}</p>\n                  {aiAdvice && <p><strong>Recommended action:</strong> {aiAdvice}</p>}\n                  <p><small>AI risk score is an estimate, not a guarantee of safety. Submitted text is sent to Cloudflare Workers AI.</small></p>', 1)
s = s.replace('              {analysis.flags.map((flag) => (', '              {(aiVerified ? analysis.flags : []).map((flag) => (', 1)
# Stop stale scores from being shown after failed scan; above isPendingScore + displayRisk handles it.
path.write_text(s, encoding='utf-8')
print('Patched', path)

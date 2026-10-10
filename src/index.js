const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=UTF-8',
}

const normalizeText = (value) => String(value ?? '').trim()

const fallbackHeuristicAnalysis = (text, imagePresent) => {
  const normalized = normalizeText(text).toLowerCase()
  const urgencyMatches = ['urgent', 'immediately', 'asap', 'right away', 'within 24 hours', 'act now'].filter((term) => normalized.includes(term))
  const impersonationMatches = ['bank', 'paypal', 'apple', 'microsoft', 'official', 'security', 'customer support'].filter((term) => normalized.includes(term))
  const linkMatches = ['click this link', 'verify here', 'restore access', 'secure account', 'http://', 'https://', 'login now'].filter((term) => normalized.includes(term))
  const emotionalMatches = ['suspended', 'locked', 'danger', 'lose access', 'threat', 'immediately', 'panic'].filter((term) => normalized.includes(term))

  const urgencyScore = Math.min(96, 15 + urgencyMatches.length * 16)
  const impersonationScore = Math.min(94, 18 + impersonationMatches.length * 14)
  const linkScore = Math.min(98, 12 + linkMatches.length * 15)
  const emotionalScore = Math.min(96, 14 + emotionalMatches.length * 15)

  const score = Math.min(99, Math.max(18, Math.round((urgencyScore + impersonationScore + linkScore + emotionalScore) / 4 + (imagePresent ? 8 : 0))))

  return {
    score,
    risk: score >= 75 ? 'High' : score >= 45 ? 'Moderate' : 'Low',
    summary: imagePresent
      ? 'The uploaded image and message show strong phishing indicators, including urgency, impersonation, and pressure tactics.'
      : 'The message contains urgency, pressure, and impersonation patterns that resemble a phishing attempt.',
    flags: [
      urgencyMatches.length ? 'Urgent language detected' : 'No urgent language detected',
      linkMatches.length ? 'Suspicious link or click request' : 'No obvious phishing link pattern',
      impersonationMatches.length ? 'Possible impersonation or trust signal' : 'No impersonation cues identified',
      emotionalMatches.length ? 'Emotional manipulation cues present' : 'Low-pressure language detected',
    ],
    signals: [
      { label: 'Urgency', value: urgencyScore, icon: '⚡' },
      { label: 'Impersonation', value: impersonationScore, icon: '🪪' },
      { label: 'Link Risk', value: linkScore, icon: '🔗' },
      { label: 'Manipulation', value: emotionalScore, icon: '🎭' },
    ],
  }
}

const extractOutputText = (parsed) => {
  if (!parsed) return ''

  if (typeof parsed.output_text === 'string') {
    return parsed.output_text
  }

  if (Array.isArray(parsed.output)) {
    return parsed.output
      .map((item) => {
        if (item?.content && Array.isArray(item.content)) {
          return item.content
            .map((contentItem) => contentItem?.text ?? '')
            .join('\n')
        }

        return item?.content ?? ''
      })
      .join('\n')
  }

  return ''
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (url.pathname === '/api/analyze') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
      }

      let payload = {}

      try {
        payload = await request.json()
      } catch {
        payload = {}
      }

      const text = normalizeText(payload.text)
      const image = payload.image ? String(payload.image) : ''
      const apiKey = env.OPENAI_API_KEY

      if (!apiKey) {
        return new Response(JSON.stringify(fallbackHeuristicAnalysis(text, Boolean(image))), {
          status: 200,
          headers: corsHeaders,
        })
      }

      try {
        const prompt = `You are a phishing detection analyst. Review the supplied message or image evidence for fraud, urgency, impersonation, malicious links, and emotional manipulation. Return valid JSON only with keys: score, risk, summary, flags, signals. score is a number 0-99. risk is one of: High, Moderate, Low. summary is a short paragraph. flags is an array of strings. signals is an array of objects with label, value, icon.`

        const resultPayload = {
          model: env.OPENAI_MODEL || 'gpt-4.1-mini',
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `${prompt}\n\nMessage to review:\n${text || 'No message text provided.'}`,
                },
              ],
            },
          ],
        }

        if (image) {
          resultPayload.input[0].content.push({
            type: 'input_image',
            image_url: image,
          })
        }

        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resultPayload),
        })

        const responseText = await response.text()

        if (!response.ok) {
          throw new Error(responseText)
        }

        let parsed
        try {
          parsed = JSON.parse(responseText)
        } catch {
          parsed = null
        }

        const outputText = extractOutputText(parsed)
        let finalPayload = fallbackHeuristicAnalysis(text, Boolean(image))

        if (outputText) {
          try {
            const start = outputText.indexOf('{')
            const candidateText = start >= 0 ? outputText.slice(start) : outputText
            const candidate = JSON.parse(candidateText)

            if (candidate && typeof candidate.score === 'number') {
              finalPayload = {
                score: Math.max(0, Math.min(99, Number(candidate.score))),
                risk: candidate.risk || finalPayload.risk,
                summary: candidate.summary || finalPayload.summary,
                flags: Array.isArray(candidate.flags) && candidate.flags.length ? candidate.flags : finalPayload.flags,
                signals: Array.isArray(candidate.signals) && candidate.signals.length ? candidate.signals : finalPayload.signals,
              }
            }
          } catch {
            finalPayload = fallbackHeuristicAnalysis(text, Boolean(image))
          }
        }

        return new Response(JSON.stringify(finalPayload), {
          status: 200,
          headers: corsHeaders,
        })
      } catch (error) {
        console.error('OpenAI analysis error:', error)
        return new Response(JSON.stringify(fallbackHeuristicAnalysis(text, Boolean(image))), {
          status: 200,
          headers: corsHeaders,
        })
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders })
  },
}


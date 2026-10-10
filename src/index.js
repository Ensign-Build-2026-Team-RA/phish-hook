const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=UTF-8',
}

const normalizeText = (value) => String(value ?? '').trim()

const fallbackHeuristicAnalysis = (text, imagePresent) => {
  const normalized = normalizeText(text).toLowerCase()
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

  return {
    score,
    risk,
    summary:
      matchedChecks.length > 0
        ? `OWASP Top 10 review found ${matchedChecks.length} relevant web-security patterns consistent with a phishing attempt.`
        : 'OWASP Top 10 review did not detect a strong phishing pattern in the provided content.',
    flags: matchedChecks.length
      ? matchedChecks.slice(0, 4).map((check) => `OWASP ${check.id}: ${check.label}`)
      : ['OWASP A09: Security logging and monitoring gaps not detected'],
    signals: matchedChecks.length
      ? matchedChecks.slice(0, 4).map((check) => ({
          label: `${check.id} ${check.label}`,
          value: check.value,
          icon: check.icon,
        }))
      : [
          { label: 'A09 Logging & Monitoring', value: 0, icon: '📊' },
          { label: 'A10 Unsafe URLs', value: 0, icon: '🔗' },
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

    if (url.pathname === '/' && request.method === 'GET') {
      return env.ASSETS.fetch(request)
    }

    if (url.pathname === '/api/docs' && request.method === 'GET') {
      return new Response(JSON.stringify({
        name: 'phish-hook',
        description: 'Phishing analysis API',
        endpoints: {
          'POST /api/analyze': 'Analyze message text or image for phishing indicators',
          'POST /analyze': 'Analyze email or message content with Workers AI',
          'POST /chat': 'Complete a general prompt with Workers AI',
        },
      }, null, 2), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (url.pathname === '/analyze' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}))
        const content = normalizeText(body.content ?? body.message ?? body.text)

        if (!content) {
          return new Response(JSON.stringify({ error: "Missing required 'content' field in JSON body." }), {
            status: 400,
            headers: corsHeaders,
          })
        }

        const sender = normalizeText(body.sender) || 'Unknown'
        const subject = normalizeText(body.subject) || 'No Subject'
        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'Analyze messages for phishing indicators. Give a risk level, estimated probability, red flags, and recommendations.',
            },
            {
              role: 'user',
              content: `Sender: ${sender}\nSubject: ${subject}\n\nBody/Content:\n${content}`,
            },
          ],
        })

        return new Response(JSON.stringify({ success: true, analysis: aiResponse.response }), {
          status: 200,
          headers: corsHeaders,
        })
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: corsHeaders,
        })
      }
    }

    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}))
        const prompt = normalizeText(body.prompt ?? body.message)

        if (!prompt) {
          return new Response(JSON.stringify({ error: "Missing 'prompt' in request body." }), {
            status: 400,
            headers: corsHeaders,
          })
        }

        const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { prompt })
        return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders })
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      }
    }

    if (url.pathname === '/api/analyze') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
      }

      let payload

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
        const prompt = `You are a phishing detection analyst. Review the supplied message or image evidence using the OWASP Top 10 categories, especially A01, A02, A03, A04, A05, A06, A07, A08, A09, and A10. Focus on account takeover attempts, credential theft, unsafe links, impersonation, urgency, authentication failures, and manipulation patterns. Return valid JSON only with keys: score, risk, summary, flags, signals. score is a number 0-99. risk is one of: High, Moderate, Low. summary is a short paragraph. flags is an array of strings that should reference OWASP category IDs and names when relevant. signals is an array of objects with label, value, icon.`

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

        const response = await globalThis.fetch('https://api.openai.com/v1/responses', {
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

    return new Response(JSON.stringify({ error: 'Not Found', message: `No route for ${request.method} ${url.pathname}` }), {
      status: 404,
      headers: corsHeaders,
    })
  },
}

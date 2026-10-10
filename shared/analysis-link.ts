export const MAX_MESSAGE_LENGTH = 5000
export const MAX_ANALYSIS_LINK_LENGTH = 2000

export function createAnalysisLink(siteUrl: string, message?: string): string | null {
  const url = new URL(siteUrl)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('The analysis site must use HTTPS.')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The analysis site URL must not contain credentials, a query, or a fragment.')
  }
  url.hash = 'analyze'
  if (message !== undefined) {
    if (message.length > MAX_MESSAGE_LENGTH) return null
    url.hash = `analyze?message=${encodeURIComponent(message)}`
  }
  return url.href.length <= MAX_ANALYSIS_LINK_LENGTH ? url.href : null
}

export function readAnalysisFragment(hash: string): { message: string; error: string } | null {
  if (hash === '#analyze') return { message: '', error: '' }
  const prefix = '#analyze?message='
  if (!hash.startsWith(prefix)) return null
  if (hash.length > MAX_ANALYSIS_LINK_LENGTH) {
    return { message: '', error: 'This email link is too large. Paste the message manually; it has not been truncated.' }
  }
  try {
    const message = decodeURIComponent(hash.slice(prefix.length))
    if (message.length > MAX_MESSAGE_LENGTH) {
      return { message: '', error: `This message exceeds the ${MAX_MESSAGE_LENGTH.toLocaleString()} character limit. It has not been truncated.` }
    }
    return { message, error: '' }
  } catch {
    return { message: '', error: 'This email link is damaged. Paste the message manually.' }
  }
}

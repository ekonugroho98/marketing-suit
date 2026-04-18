export function buildUTMUrl(baseUrl, { source, medium, campaign, term, content }) {
  const url = new URL(baseUrl)
  if (source) url.searchParams.set('utm_source', source)
  if (medium) url.searchParams.set('utm_medium', medium)
  if (campaign) url.searchParams.set('utm_campaign', campaign)
  if (term) url.searchParams.set('utm_term', term)
  if (content) url.searchParams.set('utm_content', content)
  return url.toString()
}

export function parseUTMParams(url) {
  try {
    const u = new URL(url)
    return {
      source: u.searchParams.get('utm_source') || '',
      medium: u.searchParams.get('utm_medium') || '',
      campaign: u.searchParams.get('utm_campaign') || '',
      term: u.searchParams.get('utm_term') || '',
      content: u.searchParams.get('utm_content') || '',
    }
  } catch {
    return { source: '', medium: '', campaign: '', term: '', content: '' }
  }
}

export function generateSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

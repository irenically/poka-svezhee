const pendingKey = 'poka-svezhee-pending-invite-v1'
const validCode = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function inviteUrl(code: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}#invite=${encodeURIComponent(code)}`
}

export function readPendingInvite(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const linkCode = fragment.get('invite') || ''
  if (validCode.test(linkCode)) {
    localStorage.setItem(pendingKey, JSON.stringify({ code: linkCode, savedAt: Date.now() }))
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    return linkCode
  }
  try {
    const saved = JSON.parse(localStorage.getItem(pendingKey) || 'null') as { code?: string; savedAt?: number } | null
    if (saved && validCode.test(saved.code || '') && Date.now() - (saved.savedAt || 0) < 7 * 86400000) return saved.code!
  } catch { /* An old or damaged value can be ignored. */ }
  localStorage.removeItem(pendingKey)
  return ''
}

export function clearPendingInvite() {
  localStorage.removeItem(pendingKey)
}

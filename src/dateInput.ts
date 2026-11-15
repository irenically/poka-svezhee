import { isValidISODate } from './expiryDate.ts'

export function displayDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value
}

export function formatDateInput(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  const digits = text.replace(/\D/g, '').slice(0, 8)
  const yearFirst = /^\d{4}[./-]/.test(text) || (!/[./-]/.test(text) && /^(?:19|20)\d{2}/.test(digits))
  if (yearFirst) {
    const partial = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-')
    return partial
  }
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  const partial = [day, month, year].filter(Boolean).join('.')
  if (digits.length === 8) {
    const iso = `${year}-${month}-${day}`
    if (isValidISODate(iso)) return iso
  }
  return partial
}

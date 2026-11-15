export type DateCandidate = { date: string; label: string; score: number }

function isoDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function yearValue(value: string) {
  return value.length === 2 ? 2000 + Number(value) : Number(value)
}

function contextScore(text: string, start: number) {
  const context = text.slice(Math.max(0, start - 55), start).toLowerCase()
  const lastMatch = (pattern: RegExp) => [...context.matchAll(pattern)].at(-1)?.index ?? -1
  const expiry = lastMatch(/годен|срок годности|употребить до|лучше до|expiry|expires|[eе][xх][pр]\.?|best before|use by|galioja|tinka vartoti/g)
  const manufacture = lastMatch(/изготов|произвед|дата производства|упакован|manufactur|packed|mfg|pagamint/g)
  if (expiry < 0 && manufacture < 0) return 0
  return expiry > manufacture ? 4 : -4
}

export function extractDateCandidates(text: string): DateCandidate[] {
  const found = new Map<string, DateCandidate>()
  const patterns = [
    /(?<!\d)(\d{4})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})(?!\d)/g,
    /(?<!\d)(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{2,4})(?!\d)/g,
  ]
  for (const [index, pattern] of patterns.entries()) {
    for (const match of text.matchAll(pattern)) {
      const date = index === 0
        ? isoDate(Number(match[1]), Number(match[2]), Number(match[3]))
        : isoDate(yearValue(match[3]), Number(match[2]), Number(match[1]))
      if (!date) continue
      const score = contextScore(text, match.index)
      const candidate = { date, label: match[0], score }
      if (!found.has(date) || found.get(date)!.score < score) found.set(date, candidate)
    }
  }
  return [...found.values()].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
}

export function suggestedDate(candidates: DateCandidate[]): string | null {
  if (candidates.length === 1 && candidates[0].score >= 0) return candidates[0].date
  if (candidates.length > 1 && candidates[0].score >= 4 && candidates[0].score > candidates[1].score) return candidates[0].date
  return null
}

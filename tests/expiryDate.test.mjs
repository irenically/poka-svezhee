import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractDateCandidates, isValidISODate, suggestedDate } from '../src/expiryDate.ts'

test('reads common European expiry date formats', () => {
  for (const text of ['Годен до 25.12.2026', 'Use by 25/12/26', 'Best before 2026-12-25']) {
    const dates = extractDateCandidates(text)
    assert.equal(suggestedDate(dates), '2026-12-25')
  }
})

test('prefers expiry over manufacturing date', () => {
  const dates = extractDateCandidates('MFG 01.10.2026 EXP 15.11.2026')
  assert.equal(suggestedDate(dates), '2026-11-15')
  assert.deepEqual(dates.map(item => item.date), ['2026-11-15', '2026-10-01'])
})

test('handles mixed Latin and Cyrillic OCR letters in EXP', () => {
  assert.equal(suggestedDate(extractDateCandidates('MFG 01.10.2026 ЕХР 25.12.2026')), '2026-12-25')
})

test('does not guess between two unlabelled dates', () => {
  assert.equal(suggestedDate(extractDateCandidates('01.11.2026 15.11.2026')), null)
})

test('rejects impossible calendar dates', () => {
  assert.deepEqual(extractDateCandidates('31.02.2027'), [])
  assert.equal(isValidISODate('2027-02-31'), false)
  assert.equal(isValidISODate('2026-11-15'), true)
})

test('reads medicine month-year expiry as the end of the month', () => {
  assert.equal(suggestedDate(extractDateCandidates('EXP 02.2028', true)), '2028-02-29')
  assert.deepEqual(extractDateCandidates('EXP 13.2028', true), [])
  assert.deepEqual(extractDateCandidates('EXP 02.2028'), [])
})

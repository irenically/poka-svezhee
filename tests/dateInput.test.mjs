import test from 'node:test'
import assert from 'node:assert/strict'
import { displayDate, formatDateInput } from '../src/dateInput.ts'

test('formats year-first digits while typing and accepts a complete date', () => {
  assert.equal(formatDateInput('2028020'), '2028-02-0')
  assert.equal(formatDateInput('20280201'), '2028-02-01')
  assert.equal(displayDate(formatDateInput('20280201')), '01.02.2028')
})

test('formats Lithuanian day-first input and converts it for storage', () => {
  assert.equal(formatDateInput('0102'), '01.02')
  assert.equal(formatDateInput('01022028'), '2028-02-01')
  assert.equal(formatDateInput('01.02.2028'), '2028-02-01')
})

test('does not accept an impossible date', () => {
  assert.equal(formatDateInput('31022028'), '31.02.2028')
})

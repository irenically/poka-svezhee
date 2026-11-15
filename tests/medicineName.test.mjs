import test from 'node:test'
import assert from 'node:assert/strict'
import { medicineNameCandidates } from '../src/medicineName.ts'

test('suggests medicine name without expiry and batch labels', () => {
  const text = 'IBUPROFEN 400 mg\nTabletės\nEXP 12.2027\nLOT A1234\nPharma Ltd'
  assert.deepEqual(medicineNameCandidates(text), ['IBUPROFEN 400 mg', 'Pharma Ltd'])
})

test('keeps Cyrillic package names as editable suggestions', () => {
  assert.deepEqual(medicineNameCandidates('Нурофен\nГоден до 12.2027'), ['Нурофен'])
})

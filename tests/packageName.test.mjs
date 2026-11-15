import test from 'node:test'
import assert from 'node:assert/strict'
import { packageNameCandidates } from '../src/packageName.ts'

test('suggests medicine name without expiry and batch labels', () => {
  const text = 'IBUPROFEN 400 mg\nTabletės\nEXP 12.2027\nLOT A1234\nPharma Ltd'
  assert.deepEqual(packageNameCandidates(text), ['IBUPROFEN 400 mg', 'Pharma Ltd'])
})

test('keeps Cyrillic package names as editable suggestions', () => {
  assert.deepEqual(packageNameCandidates('Нурофен\nГоден до 12.2027'), ['Нурофен'])
})

test('suggests a food name without ingredient and best-before labels', () => {
  assert.deepEqual(packageNameCandidates('Pomidorų padažas\nIngredients: tomatoes\nBest before 12.2027'), ['Pomidorų padažas'])
})

test('does not mistake broken OCR fragments for a medicine name', () => {
  assert.deepEqual(packageNameCandidates('ET Ss as EA\nBar, j\nec ©. ep Ë a b en e\nkolos skanio/ar kolas garšu'), [])
})

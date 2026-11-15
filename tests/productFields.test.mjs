import test from 'node:test'
import assert from 'node:assert/strict'
import { parseQuantity, formatQuantity } from '../src/quantity.ts'
import { findProduce } from '../src/produce.ts'
import { categoryFromBarcode } from '../src/category.ts'

test('parses old quantities and formats the new controls', () => {
  assert.deepEqual(parseQuantity('1 шт.'), { amount: '1', unit: 'шт', legacy: null })
  assert.deepEqual(parseQuantity('500 г'), { amount: '500', unit: 'г', legacy: null })
  assert.equal(formatQuantity(1.5, 'кг'), '1.5 кг')
  assert.equal(parseQuantity('полпачки').legacy, 'полпачки')
})

test('suggests fresh produce from its name only', () => {
  assert.equal(findProduce('Помидоры')?.id, 'unl-tomatoes')
  assert.equal(findProduce('Помидоры черри')?.id, '600')
  assert.equal(findProduce('Томатный соус'), null)
  assert.equal(findProduce('Морковь')?.id, '279')
})

test('maps barcode taxonomy to a useful category', () => {
  assert.equal(categoryFromBarcode(['en:dairies', 'en:yogurts']), 'dairy')
  assert.equal(categoryFromBarcode(['en:vegetables', 'en:tomatoes']), 'vegetables')
  assert.equal(categoryFromBarcode(['en:unclassified-foods']), null)
})

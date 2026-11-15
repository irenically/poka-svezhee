export const units = ['шт', 'г', 'кг', 'мл', 'л'] as const
export type Unit = typeof units[number]

const unitAliases: Record<string, Unit> = {
  'шт': 'шт', 'штука': 'шт', 'штуки': 'шт', 'штук': 'шт', 'pc': 'шт', 'pcs': 'шт', 'piece': 'шт', 'pieces': 'шт',
  'г': 'г', 'g': 'г', 'кг': 'кг', 'kg': 'кг', 'мл': 'мл', 'ml': 'мл', 'л': 'л', 'l': 'л',
}

export function parseQuantity(value: string): { amount: string; unit: Unit; legacy: string | null } {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*([\p{L}]+)\.?$/u)
  const unit = match && unitAliases[match[2].toLowerCase()]
  if (match && unit) return { amount: match[1].replace(',', '.'), unit, legacy: null }
  return { amount: '1', unit: 'шт', legacy: value.trim() || null }
}

export function formatQuantity(amount: number, unit: Unit) {
  return `${String(Number(amount.toFixed(3)))} ${unit}${unit === 'шт' ? '.' : ''}`
}

export function quantityStep(unit: Unit) {
  return unit === 'шт' ? 1 : unit === 'г' || unit === 'мл' ? 10 : 0.1
}

export function minimumQuantity(unit: Unit) {
  return unit === 'шт' || unit === 'г' || unit === 'мл' ? 1 : 0.1
}

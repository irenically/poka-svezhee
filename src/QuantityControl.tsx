import { useEffect, useRef, useState } from 'react'
import { formatQuantity, minimumQuantity, parseQuantity, quantityStep, units, type Unit } from './quantity'

export function QuantityControl({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const initial = parseQuantity(value)
  const [amount, setAmount] = useState(initial.amount)
  const [unit, setUnit] = useState<Unit>(initial.unit)
  const [legacy, setLegacy] = useState(initial.legacy)
  const lastEmitted = useRef<string | null>(null)

  useEffect(() => {
    if (value === lastEmitted.current) return
    const parsed = parseQuantity(value)
    setAmount(parsed.amount); setUnit(parsed.unit); setLegacy(parsed.legacy)
  }, [value])

  function commit(nextAmount: number, nextUnit: Unit) {
    const formatted = formatQuantity(nextAmount, nextUnit)
    lastEmitted.current = formatted
    setAmount(String(Number(nextAmount.toFixed(3))))
    setUnit(nextUnit)
    setLegacy(null)
    onChange(formatted)
  }

  function changeAmount(raw: string) {
    setAmount(raw)
    const parsed = Number(raw.replace(',', '.'))
    if (raw !== '' && Number.isFinite(parsed) && parsed >= minimumQuantity(unit) && (unit !== 'шт' || Number.isInteger(parsed))) {
      const formatted = formatQuantity(parsed, unit)
      lastEmitted.current = formatted
      setLegacy(null)
      onChange(formatted)
    }
  }

  function step(direction: -1 | 1) {
    const current = Number(amount.replace(',', '.')) || minimumQuantity(unit)
    commit(Math.max(minimumQuantity(unit), current + direction * quantityStep(unit)), unit)
  }

  return <div className="field quantity-field"><span id="quantity-label">Количество</span>
    <div className="quantity-control">
      <button type="button" onClick={() => step(-1)} aria-label="Уменьшить количество">−</button>
      <input type="number" inputMode="decimal" required min={minimumQuantity(unit)} step={unit === 'шт' ? 1 : 'any'} value={amount} onChange={event => changeAmount(event.target.value)} onBlur={() => { const parsed = Number(amount.replace(',', '.')); if (Number.isFinite(parsed) && parsed >= minimumQuantity(unit)) commit(parsed, unit) }} aria-labelledby="quantity-label" />
      <button type="button" onClick={() => step(1)} aria-label="Увеличить количество">+</button>
      <select value={unit} onChange={event => { const next = event.target.value as Unit; const current = Number(amount.replace(',', '.')) || minimumQuantity(next); commit(next === 'шт' ? Math.max(1, Math.round(current)) : Math.max(minimumQuantity(next), current), next) }} aria-label="Единица измерения">{units.map(option => <option key={option} value={option}>{option}</option>)}</select>
    </div>
    {legacy && <p className="quantity-legacy">Раньше было: {legacy}. Нажми «+» или выбери единицу, чтобы заменить.</p>}
  </div>
}

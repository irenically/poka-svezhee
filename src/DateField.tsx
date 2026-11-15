import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { isValidISODate } from './expiryDate'

export function DateField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error: string }) {
  const picker = useRef<HTMLInputElement>(null)
  function openPicker() {
    try { picker.current?.showPicker() }
    catch { picker.current?.click() }
  }
  return <div className="field date-field">
    <label htmlFor="product-date">Дата · ГГГГ-ММ-ДД</label>
    <div className="date-control">
      <input id="product-date" type="text" inputMode="numeric" value={value} onChange={event => onChange(event.target.value)} placeholder="2026-11-15" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" title="Введи дату в формате ГГГГ-ММ-ДД" aria-invalid={!!error} aria-describedby={error ? 'product-date-error' : undefined} />
      <button type="button" onClick={openPicker} aria-label="Выбрать дату в календаре" title="Выбрать дату"><CalendarDays size={19} aria-hidden="true" /></button>
      <input ref={picker} className="date-native-picker" type="date" lang="lt-LT" tabIndex={-1} aria-hidden="true" value={isValidISODate(value) ? value : ''} onChange={event => onChange(event.target.value)} />
    </div>
    {error && <p id="product-date-error" className="field-message error" role="alert">{error}</p>}
  </div>
}

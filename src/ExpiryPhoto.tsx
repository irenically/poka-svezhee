import { useEffect, useRef, useState } from 'react'
import { extractDateCandidates, suggestedDate, type DateCandidate } from './expiryDate'

export function ExpiryPhoto({ onDate, onBusyChange }: { onDate: (date: string) => void; onBusyChange: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState<DateCandidate[]>([])
  const [recognized, setRecognized] = useState('')
  const [selected, setSelected] = useState('')
  const alive = useRef(true)
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null)

  useEffect(() => { alive.current = true; return () => { alive.current = false; void workerRef.current?.terminate().catch(() => {}) } }, [])

  async function readPhoto(file?: File) {
    if (!file) return
    setError(''); setCandidates([]); setRecognized(''); setSelected('')
    if (!file.type.startsWith('image/')) { setError('Выбери изображение упаковки.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Фото слишком большое. Выбери файл до 20 МБ.'); return }
    onDate('')
    setBusy(true); onBusyChange(true); setProgress('Загружаем распознавание…')
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['rus', 'eng'], 1, {
        logger: event => {
          if (alive.current && event.status === 'recognizing text') setProgress(`Читаем дату: ${Math.round(event.progress * 100)}%`)
        },
      })
      workerRef.current = worker
      if (!alive.current) { await worker.terminate(); return }
      const result = await worker.recognize(file, { rotateAuto: true })
      if (!alive.current) return
      const text = result.data.text.trim()
      const dates = extractDateCandidates(text)
      setRecognized(text)
      setCandidates(dates)
      const suggested = suggestedDate(dates)
      if (suggested) { setSelected(suggested); onDate(suggested) }
      if (!dates.length) setError('Дата не распознана. Попробуй снять её ближе при хорошем свете или введи вручную.')
    } catch {
      if (alive.current) setError('Не удалось прочитать фото. Проверь интернет для загрузки OCR и попробуй JPG или PNG.')
    } finally {
      if (workerRef.current) await workerRef.current.terminate().catch(() => {})
      workerRef.current = null
      if (alive.current) { setBusy(false); onBusyChange(false); setProgress('') }
    }
  }

  return <div className="photo-expiry">
    <div className="field-title">Срок годности по фото</div>
    <p>Сфотографируй дату на упаковке — подставим её в поле выше. Фото обрабатывается в браузере.</p>
    <div className="photo-actions">
      <label className={busy ? 'disabled' : ''}>Сфотографировать<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = '' }} /></label>
      <label className={busy ? 'disabled' : ''}>Выбрать фото<input type="file" accept="image/*" disabled={busy} onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = '' }} /></label>
    </div>
    {busy && <p role="status" className="field-message">{progress}</p>}
    {error && <p role="alert" className="field-message error">{error}</p>}
    {candidates.length > 0 && <div className="photo-results"><p>{selected ? 'Нашли дату. Проверь её перед сохранением.' : 'Нашли несколько дат. Выбери срок годности:'}</p><div className="photo-options">{candidates.map(candidate => <button key={candidate.date} type="button" className={selected === candidate.date ? 'selected' : ''} onClick={() => { setSelected(candidate.date); onDate(candidate.date) }}>{candidate.label}</button>)}</div></div>}
    {recognized && <details><summary>Показать распознанный текст</summary><pre>{recognized}</pre></details>}
  </div>
}

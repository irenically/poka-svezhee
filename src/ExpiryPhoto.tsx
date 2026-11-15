import { useEffect, useRef, useState } from 'react'
import type { Worker } from 'tesseract.js'
import { Alert, Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { extractDateCandidates, suggestedDate, type DateCandidate } from './expiryDate'
import { packageNameCandidates } from './packageName'

async function imageForOcr(file: File): Promise<File | Blob> {
  try {
    const image = await createImageBitmap(file)
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height))
    if (scale === 1) { image.close(); return file }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.close()
    return await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.88))
  } catch { return file }
}

export function ExpiryPhoto({ onDate, onBusyChange, onName, onPhotoIntent, currentName, medicineMode = false }: { onDate: (date: string) => void; onBusyChange: (busy: boolean) => void; onName: (name: string) => void; onPhotoIntent: () => void; currentName: string; medicineMode?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState<DateCandidate[]>([])
  const [recognized, setRecognized] = useState('')
  const [selected, setSelected] = useState('')
  const [nameCandidates, setNameCandidates] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState('')
  const alive = useRef(true)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => { alive.current = true; return () => { alive.current = false; void workerRef.current?.terminate().catch(() => {}) } }, [])

  async function readPhoto(file?: File) {
    if (!file) return
    setError(''); setCandidates([]); setNameCandidates([]); setRecognized(''); setSelected(''); setSelectedName('')
    if (!file.type.startsWith('image/')) { setError('Выбери изображение упаковки.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Фото слишком большое. Выбери файл до 20 МБ.'); return }
    setBusy(true); onBusyChange(true); setProgress('Подготавливаем фото…')
    try {
      const image = await imageForOcr(file)
      if (!alive.current) return
      const { createWorker } = await import('tesseract.js')
      if (!workerRef.current) setProgress('Загружаем распознавание…')
      const worker = workerRef.current || await createWorker(['lit', 'eng', 'rus'], 1, {
        logger: event => {
          if (alive.current && event.status === 'recognizing text') setProgress(`Читаем упаковку: ${Math.round(event.progress * 100)}%`)
        },
      })
      workerRef.current = worker
      if (!alive.current) { await worker.terminate(); return }
      const result = await worker.recognize(image, { rotateAuto: true })
      if (!alive.current) return
      const text = result.data.text.trim()
      const dates = extractDateCandidates(text, medicineMode)
      const names = packageNameCandidates(text)
      setRecognized(text)
      setCandidates(dates)
      setNameCandidates(names)
      if (names.length && !currentName.trim()) { setSelectedName(names[0]); onName(names[0]) }
      const suggested = suggestedDate(dates)
      if (suggested) { setSelected(suggested); onDate(suggested) }
      if (!dates.length && !names.length) setError('Не удалось уверенно прочитать название и дату. Сними надпись ближе при хорошем свете или введи вручную.')
      else if (!dates.length) setError('Название найдено, а дата нет. Можно снять сторону упаковки со сроком отдельно.')
    } catch {
      await workerRef.current?.terminate().catch(() => {})
      workerRef.current = null
      if (alive.current) setError('Не удалось прочитать фото. Проверь интернет для загрузки OCR и попробуй JPG или PNG.')
    } finally {
      if (alive.current) { setBusy(false); onBusyChange(false); setProgress('') }
    }
  }

  return <Box className="photo-expiry">
    <Typography variant="body2" fontWeight={700}>Фото упаковки</Typography>
    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>Подскажем название и срок. Если они на разных сторонах, сними второе фото. Проверь результат перед сохранением. Фото обрабатывается в браузере.</Typography>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button variant="outlined" component="label" disabled={busy} onClick={onPhotoIntent}>Сфотографировать<input hidden type="file" accept="image/*" capture="environment" disabled={busy} onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = '' }} /></Button>
      <Button variant="outlined" component="label" disabled={busy} onClick={onPhotoIntent}>Выбрать фото<input hidden type="file" accept="image/*" disabled={busy} onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = '' }} /></Button>
    </Stack>
    {busy && <Typography variant="caption" role="status">{progress}</Typography>}
    {error && <Alert severity="warning" sx={{ mt: 1 }}>{error}</Alert>}
    {nameCandidates.length > 0 && <Box mt={1.5}><Typography variant="body2" mb={1}>Похоже на название — выбери подходящее или поправь поле ниже:</Typography><ToggleButtonGroup exclusive value={selectedName} onChange={(_event, value: string | null) => { if (value) { setSelectedName(value); onName(value) } }} size="small" sx={{ flexWrap: 'wrap' }}>{nameCandidates.map(candidate => <ToggleButton key={candidate} value={candidate}>{candidate}</ToggleButton>)}</ToggleButtonGroup></Box>}
    {candidates.length > 0 && <Box mt={1.5}><Typography variant="body2" mb={1}>{selected ? 'Нашли дату. Проверь её перед сохранением.' : 'Нашли несколько дат. Выбери срок годности:'}</Typography><ToggleButtonGroup exclusive value={selected} onChange={(_event, value: string | null) => { if (value) { setSelected(value); onDate(value) } }} size="small" sx={{ flexWrap: 'wrap' }}>{candidates.map(candidate => <ToggleButton key={candidate.date} value={candidate.date}>{candidate.label}</ToggleButton>)}</ToggleButtonGroup></Box>}
    {recognized && <details><summary>Показать распознанный текст</summary><pre>{recognized}</pre></details>}
  </Box>
}

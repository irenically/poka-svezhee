import { useRef } from 'react'
import { Box, IconButton, InputAdornment, TextField } from '@mui/material'
import { CalendarDays } from 'lucide-react'
import { isValidISODate } from './expiryDate'

export function DateField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error: string }) {
  const picker = useRef<HTMLInputElement>(null)
  function openPicker() {
    try { picker.current?.showPicker() }
    catch { picker.current?.click() }
  }
  return <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
    <TextField fullWidth size="small" id="product-date" label="Дата · ГГГГ-ММ-ДД" value={value} onChange={event => onChange(event.target.value)} placeholder="2026-11-15" error={!!error} helperText={error || undefined} inputProps={{ inputMode: 'numeric', pattern: '[0-9]{4}-[0-9]{2}-[0-9]{2}', title: 'Введи дату в формате ГГГГ-ММ-ДД' }} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton edge="end" onClick={openPicker} aria-label="Выбрать дату в календаре"><CalendarDays size={19} /></IconButton></InputAdornment> } }} />
    <input ref={picker} className="date-native-picker" type="date" lang="lt-LT" tabIndex={-1} aria-hidden="true" value={isValidISODate(value) ? value : ''} onChange={event => onChange(event.target.value)} />
  </Box>
}

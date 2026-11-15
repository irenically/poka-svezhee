import { useRef } from 'react'
import { Box, IconButton, InputAdornment, TextField } from '@mui/material'
import { CalendarDays } from 'lucide-react'
import { isValidISODate } from './expiryDate'
import { displayDate, formatDateInput } from './dateInput'

export function DateField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error: string }) {
  const picker = useRef<HTMLInputElement>(null)
  function openPicker() {
    try { picker.current?.showPicker() }
    catch { picker.current?.click() }
  }
  return <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
    <TextField fullWidth size="small" id="product-date" label="Дата · ДД.ММ.ГГГГ" value={displayDate(value)} onChange={event => onChange(formatDateInput(event.target.value))} placeholder="01.02.2028" error={!!error} helperText={error || undefined} inputProps={{ inputMode: 'numeric', maxLength: 10 }} slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton edge="end" onClick={openPicker} aria-label="Выбрать дату в календаре"><CalendarDays size={19} /></IconButton></InputAdornment> } }} />
    <input ref={picker} className="date-native-picker" type="date" lang="lt-LT" tabIndex={-1} aria-hidden="true" value={isValidISODate(value) ? value : ''} onChange={event => onChange(event.target.value)} />
  </Box>
}

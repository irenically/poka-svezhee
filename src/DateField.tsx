import { Box, InputAdornment, TextField } from '@mui/material'
import { CalendarDays } from 'lucide-react'
import { isValidISODate } from './expiryDate'
import { displayDate, formatDateInput } from './dateInput'

export function DateField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error: string }) {
  return <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
    <TextField fullWidth size="small" id="product-date" label="Дата · ДД.ММ.ГГГГ" value={displayDate(value)} onChange={event => onChange(formatDateInput(event.target.value))} placeholder="01.02.2028" error={!!error} helperText={error || undefined} inputProps={{ inputMode: 'numeric', maxLength: 10 }} slotProps={{ input: { endAdornment: <InputAdornment position="end"><Box component="span" sx={{ position: 'relative', width: 40, height: 40, display: 'grid', placeItems: 'center', color: 'text.secondary' }}><CalendarDays size={19} aria-hidden="true" /><input className="date-picker-trigger" type="date" lang="lt-LT" aria-label="Выбрать дату в календаре" value={isValidISODate(value) ? value : ''} onChange={event => onChange(event.target.value)} onClick={event => { try { event.currentTarget.showPicker() } catch { /* Native tap opens the picker on iOS. */ } }} /></Box></InputAdornment> } }} />
  </Box>
}

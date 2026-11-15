import { useEffect, useRef, useState } from 'react'
import { Box, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { Minus, Plus } from 'lucide-react'
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

  return <Box sx={{ minWidth: 0 }}>
    <Typography id="quantity-label" variant="body2" fontWeight={700} mb={1}>Количество</Typography>
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', height: 44 }}>
        <IconButton size="small" onClick={() => step(-1)} aria-label="Уменьшить количество" sx={{ width: 40, height: 40, color: 'primary.main' }}><Minus size={18} /></IconButton>
        <TextField variant="standard" value={amount} onChange={event => changeAmount(event.target.value)} onBlur={() => { const parsed = Number(amount.replace(',', '.')); if (Number.isFinite(parsed) && parsed >= minimumQuantity(unit)) commit(parsed, unit) }} inputProps={{ inputMode: 'decimal', 'aria-labelledby': 'quantity-label', pattern: '[0-9]+([.,][0-9]+)?' }} sx={{ width: 54, '& input': { textAlign: 'center', p: 0 }, '& .MuiInput-root::before, & .MuiInput-root::after': { display: 'none' } }} />
        <IconButton size="small" onClick={() => step(1)} aria-label="Увеличить количество" sx={{ width: 40, height: 40, color: 'primary.main' }}><Plus size={18} /></IconButton>
      </Box>
      <FormControl size="small" sx={{ minWidth: 83 }}><InputLabel id="quantity-unit-label">Единица</InputLabel><Select labelId="quantity-unit-label" value={unit} label="Единица" onChange={event => { const next = event.target.value as Unit; const current = Number(amount.replace(',', '.')) || minimumQuantity(next); commit(next === 'шт' ? Math.max(1, Math.round(current)) : Math.max(minimumQuantity(next), current), next) }}>{units.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}</Select></FormControl>
    </Stack>
    {legacy && <Typography variant="caption" color="text.secondary">Раньше было: {legacy}. Нажми «+» или выбери единицу, чтобы заменить.</Typography>}
  </Box>
}

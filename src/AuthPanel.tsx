import { useState } from 'react'
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from '@mui/material'
import { X } from 'lucide-react'
import { supabase } from './supabase'

export function AuthPanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true); setMessage('')
    try {
      const options = { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL }
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options })
        : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      if (result.data.session) onClose()
      else setMessage('Проверь почту и подтверди адрес, затем вернись сюда и войди.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось войти. Попробуй ещё раз.') }
    finally { setBusy(false) }
  }

  return <Dialog open onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="auth-title">
    <DialogTitle id="auth-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <Box><Typography variant="h6" fontWeight={800}>{mode === 'signin' ? 'Войти в запасы' : 'Создать аккаунт'}</Typography><Typography variant="body2" color="text.secondary">Один список на всех твоих устройствах.</Typography></Box>
      <IconButton onClick={onClose} aria-label="Закрыть"><X size={20} /></IconButton>
    </DialogTitle>
    <DialogContent><Stack component="form" onSubmit={submit} spacing={2} pt={1}>
      <TextField label="Почта" type="email" autoComplete="email" required fullWidth value={email} onChange={event => setEmail(event.target.value)} />
      <TextField label="Пароль" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} inputProps={{ minLength: 6 }} required fullWidth value={password} onChange={event => setPassword(event.target.value)} />
      {message && <Alert severity={message.startsWith('Проверь') ? 'info' : 'error'} role="status">{message}</Alert>}
      <Button variant="contained" disabled={busy} type="submit">{busy ? 'Подожди…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</Button>
      <Button variant="text" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>{mode === 'signin' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}</Button>
    </Stack></DialogContent>
  </Dialog>
}

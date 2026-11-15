import { useState } from 'react'
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось войти. Попробуй ещё раз.')
    } finally { setBusy(false) }
  }

  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="dialog-top"><div><h2 id="auth-title">{mode === 'signin' ? 'Войти в запасы' : 'Создать аккаунт'}</h2><p>Один список на всех твоих устройствах.</p></div><button className="close-button" onClick={onClose} aria-label="Закрыть">×</button></div><form onSubmit={submit}><label className="field"><span>Почта</span><input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="field"><span>Пароль</span><input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Не меньше 6 символов" /></label>{message && <p className="field-message" role="status">{message}</p>}<button className="save-button" disabled={busy} type="submit">{busy ? 'Подожди…' : mode === 'signin' ? 'Войти' : 'Создать аккаунт'}</button></form><button className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>{mode === 'signin' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}</button></section></div>
}

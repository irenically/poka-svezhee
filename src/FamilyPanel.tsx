import { useEffect, useState } from 'react'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { createHousehold, createInvite, joinHousehold, type Household } from './family'
import { inviteUrl } from './inviteLink'

export function FamilyPanel({ household, userId, pendingInvite, onJoined, onChanged, embedded = false }: { household: Household | null; userId: string; pendingInvite: string; onJoined: () => void; onChanged: () => Promise<void>; embedded?: boolean }) {
  const [code, setCode] = useState(pendingInvite)
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { if (pendingInvite) setCode(pendingInvite) }, [pendingInvite])

  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await action(); await onChanged() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие.') }
    finally { setBusy(false) }
  }

  return <Paper component="section" variant={embedded ? undefined : 'outlined'} elevation={0} aria-label="Семейный доступ" sx={{ p: embedded ? 0 : 2.5, mb: embedded ? 0 : 3, bgcolor: 'transparent' }}>
    <Typography variant="h6" fontWeight={800}>Общий холодильник</Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>{household ? `Вы и приглашённые участники видите одни и те же запасы. Название семьи: «${household.name}».` : 'Создай общий доступ к запасам или присоединись по приглашению.'}</Typography>
    {!household ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      {!pendingInvite && <Button variant="outlined" disabled={busy} onClick={() => run(createHousehold)}>Создать семейный список</Button>}
      <TextField size="small" label={pendingInvite ? 'Приглашение по ссылке' : 'Код приглашения'} value={code} onChange={event => setCode(event.target.value)} sx={{ flex: 1 }} />
      <Button variant="contained" disabled={busy || !code.trim()} onClick={() => run(async () => { await joinHousehold(code); onJoined() })}>Присоединиться</Button>
    </Stack> : household.ownerId === userId ? <Stack spacing={1.5} alignItems="flex-start">
      <Button variant="outlined" disabled={busy} onClick={() => run(async () => { setInvite(await createInvite()) })}>Создать приглашение</Button>
      {invite && <Box sx={{ maxWidth: '100%', overflowWrap: 'anywhere' }}><Typography variant="body2" mb={1}>Отправь ссылку близкому. Она действует 7 дней и используется один раз.</Typography><Typography component="code" variant="body2" display="block" mb={1}>{inviteUrl(invite)}</Typography><Button variant="text" onClick={() => navigator.clipboard.writeText(inviteUrl(invite)).then(() => setMessage('Ссылка скопирована.')).catch(() => setMessage('Выдели и скопируй ссылку вручную.'))}>Скопировать ссылку</Button></Box>}
    </Stack> : null}
    {household && pendingInvite && <Alert severity="info" sx={{ mt: 2 }}>Ты уже состоишь в семейном списке. Присоединиться к другому пока нельзя.</Alert>}
    {message && <Alert severity={message.includes('скопирована') ? 'success' : 'info'} sx={{ mt: 2 }} role="status">{message}</Alert>}
  </Paper>
}

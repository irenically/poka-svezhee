import { useEffect, useState } from 'react'
import { createHousehold, createInvite, joinHousehold, type Household } from './family'
import { inviteUrl } from './inviteLink'

export function FamilyPanel({ household, userId, pendingInvite, onJoined, onChanged }: { household: Household | null; userId: string; pendingInvite: string; onJoined: () => void; onChanged: () => Promise<void> }) {
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

  return <section className="family-panel" aria-label="Семейный доступ">
    <div><h2>Общий холодильник</h2><p>{household ? `Список «${household.name}» доступен участникам семьи.` : 'Создай семейный список или присоединись по коду приглашения.'}</p></div>
    {!household ? <div className="family-actions">
      {!pendingInvite && <button disabled={busy} onClick={() => run(createHousehold)}>Создать семейный список</button>}
      <label><span>{pendingInvite ? 'Приглашение по ссылке' : 'Код приглашения'}</span><input value={code} onChange={event => setCode(event.target.value)} placeholder="Вставь код от близкого" /></label>
      <button disabled={busy || !code.trim()} onClick={() => run(async () => { await joinHousehold(code); onJoined() })}>Присоединиться</button>
    </div> : household.ownerId === userId ? <div className="family-actions">
      <button disabled={busy} onClick={() => run(async () => { setInvite(await createInvite()) })}>Создать приглашение</button>
      {invite && <div className="invite-code"><p>Отправь ссылку близкому. Она действует 7 дней; присоединиться по ней можно один раз.</p><code>{inviteUrl(invite)}</code><button onClick={() => navigator.clipboard.writeText(inviteUrl(invite)).then(() => setMessage('Ссылка скопирована.')).catch(() => setMessage('Выдели и скопируй ссылку вручную.'))}>Скопировать ссылку</button></div>}
    </div> : null}
    {household && pendingInvite && <p className="field-message">Ты уже состоишь в семейном списке. Присоединиться к другому пока нельзя.</p>}
    {message && <p className="field-message" role="status">{message}</p>}
  </section>
}

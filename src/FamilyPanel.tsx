import { useState } from 'react'
import { createHousehold, createInvite, joinHousehold, type Household } from './family'

export function FamilyPanel({ household, userId, onChanged }: { household: Household | null; userId: string; onChanged: () => Promise<void> }) {
  const [code, setCode] = useState('')
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await action(); await onChanged() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие.') }
    finally { setBusy(false) }
  }

  return <section className="family-panel" aria-label="Семейный доступ">
    <div><h2>Общий холодильник</h2><p>{household ? `Список «${household.name}» доступен участникам семьи.` : 'Создай семейный список или присоединись по коду приглашения.'}</p></div>
    {!household ? <div className="family-actions">
      <button disabled={busy} onClick={() => run(createHousehold)}>Создать семейный список</button>
      <label><span>Код приглашения</span><input value={code} onChange={event => setCode(event.target.value)} placeholder="Вставь код от близкого" /></label>
      <button disabled={busy || !code.trim()} onClick={() => run(() => joinHousehold(code))}>Присоединиться</button>
    </div> : household.ownerId === userId ? <div className="family-actions">
      <button disabled={busy} onClick={() => run(async () => { setInvite(await createInvite()) })}>Создать приглашение</button>
      {invite && <div className="invite-code"><p>Отправь этот код близкому. Он действует 7 дней и используется один раз.</p><code>{invite}</code><button onClick={() => navigator.clipboard.writeText(invite).then(() => setMessage('Код скопирован.')).catch(() => setMessage('Выдели и скопируй код вручную.'))}>Скопировать</button></div>}
    </div> : null}
    {message && <p className="field-message" role="status">{message}</p>}
  </section>
}

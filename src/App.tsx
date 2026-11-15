import { useEffect, useMemo, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { AuthPanel } from './AuthPanel'
import { FamilyPanel } from './FamilyPanel'
import { ExpiryPhoto } from './ExpiryPhoto'
import { QuantityControl } from './QuantityControl'
import { DateField } from './DateField'
import { Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Pencil, Trash2, Utensils, X } from 'lucide-react'
import { categories, categoryFromBarcode, categoryLabel, type Category } from './category'
import { isValidISODate } from './expiryDate'
import { loadHousehold, type Household } from './family'
import { clearPendingInvite, readPendingInvite } from './inviteLink'
import { deleteCloudItem, loadCloudInventory, saveCloudItem, type DateKind, type Item, type Place } from './inventory'
import { supabase } from './supabase'
import { findProduce, reviewDate } from './produce'

const KEY = 'poka-svezhee-items-v1'
const knownKey = 'poka-svezhee-barcodes-v1'

function loadItems(): Item[] {
  try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data : [] } catch { return [] }
}
function loadKnown(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(knownKey) || '{}') } catch { return {} }
}
function dayOffset(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000)
}
function urgency(item: Item) { return item.date ? dayOffset(item.date) : 9999 }
function dateLabel(item: Item) {
  if (!item.date) return 'Срок не указан'
  const days = urgency(item)
  const prefix = item.dateKind === 'estimate' ? 'Проверить' : 'Годен до'
  if (days < 0) return item.dateKind === 'estimate' ? 'Пора проверить' : 'Срок прошёл'
  if (days === 0) return `${prefix} сегодня`
  if (days === 1) return `${prefix} завтра`
  return `${prefix} ${new Intl.DateTimeFormat('lt-LT', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(`${item.date}T00:00:00`))}`
}

export function App() {
  const [items, setItems] = useState<Item[]>(loadItems)
  const [known, setKnown] = useState<Record<string, string>>(loadKnown)
  const [place, setPlace] = useState<Place | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Item | null | 'new'>(null)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState('1 шт.')
  const [category, setCategory] = useState<Category>('other')
  const [itemPlace, setItemPlace] = useState<Place>('fridge')
  const [date, setDate] = useState('')
  const [dateKind, setDateKind] = useState<DateKind>('label')
  const [dateError, setDateError] = useState('')
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'found' | 'missing' | 'error'>('idle')
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [household, setHousehold] = useState<Household | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [cloudLoaded, setCloudLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingInvite, setPendingInvite] = useState('')
  const [saving, setSaving] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<IScannerControls | null>(null)
  const lastUserIdRef = useRef<string | null>(null)
  const autoDateRef = useRef<string | null>(null)
  const categoryTouchedRef = useRef(false)
  const scanGenerationRef = useRef(0)

  useEffect(() => {
    const readLink = () => setPendingInvite(readPendingInvite())
    readLink()
    window.addEventListener('hashchange', readLink)
    supabase.auth.getSession().then(({ data }) => {
      lastUserIdRef.current = data.session?.user.id || null
      setUserId(data.session?.user.id || null)
      setUserEmail(data.session?.user.email || '')
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (lastUserIdRef.current && !session) {
        setItems([]); setKnown({})
        setHousehold(null)
        setCloudLoaded(false)
        localStorage.removeItem(KEY); localStorage.removeItem(knownKey)
      }
      lastUserIdRef.current = session?.user.id || null
      setUserId(session?.user.id || null)
      setUserEmail(session?.user.email || '')
      setAuthReady(true)
    })
    return () => { listener.subscription.unsubscribe(); window.removeEventListener('hashchange', readLink) }
  }, [])
  useEffect(() => {
    if (!authReady || !userId) return
    let active = true
    setCloudLoaded(false)
    setSyncing(true); setCloudError('')
    loadHousehold(userId).then(async family => {
      const result = await loadCloudInventory(userId, family?.id || null, loadItems(), loadKnown())
      return { family, result }
    }).then(({ family, result }) => {
      if (!active) return
      setHousehold(family)
      setItems(result.items); setKnown(result.known)
      setCloudLoaded(true)
      localStorage.removeItem(KEY); localStorage.removeItem(knownKey)
    }).catch(error => { if (active) setCloudError(error instanceof Error ? error.message : 'Не удалось загрузить запасы.') })
      .finally(() => { if (active) setSyncing(false) })
    return () => { active = false }
  }, [authReady, userId])
  async function refreshFamily() {
    if (!userId) return
    setSyncing(true); setCloudError('')
    try {
      const family = await loadHousehold(userId)
      const result = await loadCloudInventory(userId, family?.id || null, [], {})
      setHousehold(family); setItems(result.items); setKnown(result.known)
    } catch (error) { setCloudError(error instanceof Error ? error.message : 'Не удалось обновить список.') }
    finally { setSyncing(false) }
  }
  useEffect(() => {
    if (!userId) return
    const onFocus = () => { void refreshFamily() }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(onFocus, 30000)
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer) }
  }, [userId])
  useEffect(() => () => scannerRef.current?.stop(), [])

  const visible = useMemo(() => items.filter(item => (place === 'all' || item.place === place) && (categoryFilter === 'all' || (item.category || 'other') === categoryFilter) && item.name.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).sort((a, b) => urgency(a) - urgency(b) || a.name.localeCompare(b.name, 'ru')), [items, place, categoryFilter, query])
  const urgentCount = items.filter(item => urgency(item) <= 2).length
  const produceSuggestion = useMemo(() => itemPlace === 'fridge' ? findProduce(name) : null, [name, itemPlace])

  function applyReviewSuggestion(choice: NonNullable<typeof produceSuggestion>) {
    const suggested = reviewDate(choice.days)
    setDate(suggested); setDateKind('estimate'); setDateError(''); autoDateRef.current = suggested
  }
  function changeName(next: string) {
    setName(next)
    const choice = itemPlace === 'fridge' ? findProduce(next) : null
    if (!categoryTouchedRef.current && choice) setCategory('vegetables')
    if (scanning) stopScan()
    if (autoDateRef.current && date === autoDateRef.current) {
      if (choice) applyReviewSuggestion(choice)
      else { setDate(''); setDateKind('label'); autoDateRef.current = null }
    } else if (!date && choice) applyReviewSuggestion(choice)
  }
  function changePlace(next: Place) {
    if (autoDateRef.current && date === autoDateRef.current) {
      if (next === 'fridge') {
        const choice = findProduce(name)
        if (choice) applyReviewSuggestion(choice)
      } else { setDate(''); setDateKind('label'); autoDateRef.current = null }
    } else if (!date && next === 'fridge') {
      const choice = findProduce(name)
      if (choice) applyReviewSuggestion(choice)
    }
    setItemPlace(next)
  }

  function openNew() {
    setEditing('new'); setName(''); setBarcode(''); setQuantity('1 шт.'); setCategory('other'); categoryTouchedRef.current = false; setItemPlace(place === 'freezer' ? 'freezer' : 'fridge'); setDate(''); setDateKind('label'); setDateError(''); autoDateRef.current = null; setLookup('idle'); setScanError(''); setOcrBusy(false); void startScan()
  }
  function openEdit(item: Item) {
    setEditing(item); setName(item.name); setBarcode(item.barcode || ''); setQuantity(item.quantity); setCategory(item.category || 'other'); categoryTouchedRef.current = !!item.category && item.category !== 'other'; setItemPlace(item.place); setDate(item.date); setDateKind(item.dateKind); setDateError(''); autoDateRef.current = null; setLookup('idle'); setScanError(''); setOcrBusy(false)
  }
  function stopScan() {
    scanGenerationRef.current += 1
    scannerRef.current?.stop(); scannerRef.current = null; setScanning(false)
  }
  function close() { stopScan(); setEditing(null); setOcrBusy(false) }

  async function findBarcode(code = barcode) {
    const normalized = code.trim().replace(/\s/g, '')
    if (!/^\d{8,14}$/.test(normalized)) { setLookup('error'); setScanError('Введите 8–14 цифр штрихкода.'); return }
    setBarcode(normalized); setScanError('')
    if (known[normalized]) { changeName(known[normalized]); setLookup('found'); return }
    setLookup('loading')
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${normalized}.json?fields=product_name,product_name_ru,brands,quantity,categories_tags`)
      if (!response.ok) throw new Error('lookup failed')
      const data = await response.json() as { status?: string; product?: { product_name?: string; product_name_ru?: string; brands?: string; quantity?: string; categories_tags?: string[] } }
      const product = data.product
      const result = product?.product_name_ru || product?.product_name
      if (result) {
        changeName([result, product?.brands].filter(Boolean).join(' · '))
        if (product?.quantity) setQuantity(product.quantity)
        const detectedCategory = categoryFromBarcode(product?.categories_tags)
        if (detectedCategory && !categoryTouchedRef.current) setCategory(detectedCategory)
        setLookup('found')
      } else setLookup('missing')
    } catch { setLookup('error'); setScanError('Не удалось связаться с базой. Название можно ввести вручную.') }
  }

  async function startScan() {
    setScanError('')
    if (!navigator.mediaDevices?.getUserMedia) { setScanError('Камера недоступна. Открой приложение по HTTPS или введи код вручную.'); return }
    const generation = ++scanGenerationRef.current
    try {
      setScanning(true)
      requestAnimationFrame(async () => {
        const video = videoRef.current
        if (!video || generation !== scanGenerationRef.current) { setScanning(false); return }
        try {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          if (generation !== scanGenerationRef.current) return
          const reader = new BrowserMultiFormatReader()
          const controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (result) => {
            if (result) { stopScan(); void findBarcode(result.getText()) }
          })
          if (generation !== scanGenerationRef.current) controls.stop()
          else scannerRef.current = controls
        } catch { setScanning(false); setScanError('Камера недоступна. Разрешите доступ или введите код вручную.') }
      })
    } catch { setScanning(false); setScanError('Камера недоступна. Разрешите доступ или введите код вручную.') }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    if (date && !isValidISODate(date)) { setDateError('Проверь дату в формате ГГГГ-ММ-ДД.'); return }
    const item: Item = { id: editing && editing !== 'new' ? editing.id : crypto.randomUUID(), name: cleanName, barcode: barcode.trim() || undefined, quantity: quantity.trim() || '1 шт.', category, place: itemPlace, date, dateKind, addedAt: editing && editing !== 'new' ? editing.addedAt : new Date().toISOString() }
    if (userId) {
      setSaving(true); setCloudError('')
      try { await saveCloudItem(userId, household?.id || null, item, editing !== 'new') }
      catch (error) { setCloudError(error instanceof Error ? error.message : 'Не удалось сохранить продукт.'); setSaving(false); return }
      setSaving(false)
    }
    setItems(current => editing === 'new' ? [item, ...current] : current.map(old => old.id === item.id ? item : old))
    if (item.barcode) setKnown(current => ({ ...current, [item.barcode!]: cleanName }))
    close()
  }
  async function remove(item: Item, action: 'ate' | 'discarded') {
    if (action === 'discarded' && !window.confirm(`Убрать «${item.name}» из запасов как выброшенное?`)) return
    if (userId) {
      try { await deleteCloudItem(item.id) }
      catch (error) { setCloudError(error instanceof Error ? error.message : 'Не удалось убрать продукт.'); return }
    }
    setItems(current => current.filter(old => old.id !== item.id))
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) { setCloudError(error.message); return }
  }

  if (!authReady || !userId) return <div className="app-shell">
    <header className="site-header"><div className="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div><div className="brand">пока<br/>свежее<span>.</span></div></header>
    <main><Paper className="auth-gate" elevation={0}><Typography variant="h3" component="h1">Общий холодильник<br/><em>под присмотром</em></Typography><Typography color="text.secondary" sx={{ my: 3 }}>{pendingInvite ? 'Тебя пригласили в общий список. Войди или создай аккаунт, чтобы присоединиться.' : 'Войди или создай аккаунт, чтобы вести запасы и делиться ими с семьёй.'}</Typography>{authReady ? <Button variant="contained" onClick={() => setAuthOpen(true)}>{pendingInvite ? 'Войти и принять приглашение' : 'Войти или зарегистрироваться'}</Button> : <Typography role="status">Проверяем вход…</Typography>}</Paper></main>
    {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
  </div>

  return <div className="app-shell">
    <header className="site-header"><div className="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div><div className="brand">пока<br/>свежее<span>.</span></div><div className="header-note"><Typography variant="caption" sx={{ display: 'block' }}>{userEmail}</Typography><Button size="small" onClick={signOut}>Выйти</Button></div></header>
    <main>
      {cloudError && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => window.location.reload()}>Повторить</Button>}>Ошибка синхронизации: {cloudError}</Alert>}
      {syncing && <Alert severity="info" sx={{ mb: 2 }} role="status">Загружаем запасы из облака…</Alert>}
      {userId && cloudLoaded && <FamilyPanel household={household} userId={userId} pendingInvite={pendingInvite} onJoined={() => { clearPendingInvite(); setPendingInvite('') }} onChanged={refreshFamily} />}
      <Paper className="overview" elevation={0}><Box><Typography variant="h2" component="h1">Что у нас<br/><em>в запасе?</em></Typography><Typography>{items.length === 0 ? 'Добавь первый продукт — и мы поможем вспомнить о нём вовремя.' : urgentCount ? `${urgentCount} ${urgentCount === 1 ? 'продукт ждёт' : 'продукта ждут'} внимания в ближайшие дни.` : 'Всё спокойно. Продукты под присмотром.'}</Typography></Box><div className="overview-illustration" aria-hidden="true"><div className="shelf shelf-one"><i></i><i></i><i></i></div><div className="shelf shelf-two"><i></i><i></i></div><div className="shelf shelf-three"><i></i><i></i><i></i></div></div></Paper>
      <section className="inventory" aria-label="Запасы"><Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}><Box><Typography variant="h5" component="h2" fontWeight={800}>Мои продукты</Typography><Typography variant="body2" color="text.secondary">{items.length} в запасе</Typography></Box><Button variant="contained" onClick={openNew} disabled={syncing}>＋ Добавить</Button></Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ my: 3 }} alignItems={{ md: 'center' }}><ToggleButtonGroup exclusive size="small" value={place} onChange={(_event, value: Place | 'all' | null) => { if (value) setPlace(value) }} aria-label="Место хранения"><ToggleButton value="all">Все</ToggleButton><ToggleButton value="fridge">Холодильник</ToggleButton><ToggleButton value="freezer">Морозилка</ToggleButton></ToggleButtonGroup><TextField select size="small" label="Категория" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as Category | 'all')} sx={{ minWidth: 175 }}><MenuItem value="all">Все категории</MenuItem>{categories.map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}</TextField><TextField size="small" label="Поиск по запасам" value={query} onChange={e => setQuery(e.target.value)} sx={{ ml: { md: 'auto' }, minWidth: 180 }} /></Stack>
        {visible.length ? <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>{visible.map(item => <Paper component="li" variant="outlined" key={item.id} sx={{ p: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}><Box className={`status-dot ${urgency(item) <= 0 ? 'late' : urgency(item) <= 2 ? 'soon' : ''}`} /><Box sx={{ minWidth: 130, flex: 1 }}><Typography fontWeight={700} noWrap>{item.name}</Typography><Typography variant="body2" color="text.secondary">{item.quantity} · {categoryLabel(item.category || 'other')} · {item.place === 'fridge' ? 'Холодильник' : 'Морозилка'}</Typography></Box><Chip label={dateLabel(item)} size="small" color={urgency(item) <= 0 ? 'error' : urgency(item) <= 2 ? 'warning' : 'default'} variant="outlined" /><Stack direction="row" spacing={0.5}><IconButton onClick={() => openEdit(item)} aria-label={`Изменить ${item.name}`} title="Изменить" sx={{ color: '#375b7a', bgcolor: '#e7edf4' }}><Pencil size={18} /></IconButton><IconButton onClick={() => remove(item, 'ate')} aria-label={`Отметить ${item.name} как съеденное`} title="Съели" sx={{ color: '#366640', bgcolor: '#e2efdc' }}><Utensils size={18} /></IconButton><IconButton onClick={() => remove(item, 'discarded')} aria-label={`Отметить ${item.name} как выброшенное`} title="Выбросили" sx={{ color: '#9b4335', bgcolor: '#f5e4dc' }}><Trash2 size={18} /></IconButton></Stack></Paper>)}</Stack> : <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#fafaf4' }}><Typography variant="h6" fontWeight={800}>{items.length ? 'Ничего не нашлось' : 'Здесь пока пусто'}</Typography><Typography color="text.secondary" sx={{ my: 2 }}>{items.length ? 'Попробуй другой запрос или раздел.' : 'Добавь продукты по названию или штрихкоду. Начнём с того, что уже лежит дома.'}</Typography><Button variant="contained" onClick={openNew}>Добавить продукт</Button></Paper>}
      </section>
    </main>
    {authOpen && <AuthPanel onClose={() => setAuthOpen(false)} />}
    <Dialog open={!!editing} onClose={close} fullWidth maxWidth="sm" aria-labelledby="dialog-title"><DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}><Box><Typography id="dialog-title" variant="h6" fontWeight={800}>{editing === 'new' ? 'Добавить продукт' : 'Изменить продукт'}</Typography><Typography variant="body2" color="text.secondary">Пара деталей — и он под присмотром.</Typography></Box><IconButton onClick={close} aria-label="Закрыть"><X size={20} /></IconButton></DialogTitle><DialogContent><Stack component="form" onSubmit={save} spacing={2.5} pt={1}>
      <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0f5e8' }}><Typography variant="body2" fontWeight={700} mb={1}>Штрихкод</Typography><Button size="small" onClick={scanning ? stopScan : startScan}>{scanning ? 'Остановить камеру' : 'Сканировать снова'}</Button>{scanning && <video ref={videoRef} className="camera" muted playsInline aria-label="Изображение с камеры" />}<Stack direction="row" spacing={1} mt={1}><TextField size="small" fullWidth inputProps={{ inputMode: 'numeric' }} value={barcode} onChange={e => { if (scanning) stopScan(); setBarcode(e.target.value); setLookup('idle') }} placeholder="Или введи цифры под штрихкодом" label="Штрихкод" /><Button variant="contained" type="button" onClick={() => findBarcode()} disabled={lookup === 'loading'}>{lookup === 'loading' ? 'Ищем…' : 'Найти'}</Button></Stack>{lookup === 'found' && <Alert severity="success" sx={{ mt: 1 }}>Нашли товар. Проверь название, категорию и количество.</Alert>}{lookup === 'missing' && <Alert severity="info" sx={{ mt: 1 }}>Такого кода пока нет в базе. Впиши название — запомним его.</Alert>}{scanError && <Alert severity="warning" sx={{ mt: 1 }}>{scanError}</Alert>}</Paper>
      <TextField required fullWidth label="Название" value={name} onChange={e => changeName(e.target.value)} placeholder="Например, помидоры или молоко" />
      {produceSuggestion && <Alert severity="info" action={(dateKind !== 'estimate' || autoDateRef.current !== date) ? <Button size="small" onClick={() => applyReviewSuggestion(produceSuggestion)}>Подставить дату</Button> : undefined}><strong>{produceSuggestion.name}:</strong> {produceSuggestion.range}. <a href={produceSuggestion.sourceUrl || 'https://catalog.data.gov/dataset/fsis-foodkeeper-data'} target="_blank" rel="noreferrer">Источник</a></Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(230px, 1fr) minmax(0, 1fr)' }, gap: 2, alignItems: 'end' }}><QuantityControl key={editing === 'new' ? 'new' : editing?.id || 'closed'} value={quantity} onChange={setQuantity} /><Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={700} mb={1}>Где хранится</Typography><TextField select size="small" fullWidth value={itemPlace} SelectProps={{ inputProps: { 'aria-label': 'Где хранится' } }} onChange={e => changePlace(e.target.value as Place)}><MenuItem value="fridge">Холодильник</MenuItem><MenuItem value="freezer">Морозилка</MenuItem></TextField></Box></Box>
      <TextField select fullWidth label="Категория" value={category} onChange={e => { categoryTouchedRef.current = true; setCategory(e.target.value as Category) }}>{categories.map(option => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}</TextField>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}><DateField value={date} onChange={value => { setDate(value); setDateError(''); autoDateRef.current = null }} error={dateError} /><TextField select fullWidth label="Что означает дата" value={dateKind} onChange={e => { setDateKind(e.target.value as DateKind); autoDateRef.current = null }}><MenuItem value="label">Срок с упаковки</MenuItem><MenuItem value="estimate">Проверить свежесть</MenuItem></TextField></Box>
      <ExpiryPhoto onDate={value => { setDate(value); setDateKind('label'); setDateError(''); autoDateRef.current = null }} onBusyChange={setOcrBusy} /><Typography variant="caption" color="text.secondary">Подсказка для свежих продуктов — ориентир от сегодняшнего дня. Если куплено раньше, поправь дату. Срок с упаковки важнее подсказки.</Typography><Button variant="contained" type="submit" disabled={saving || ocrBusy}>{saving ? 'Сохраняем…' : ocrBusy ? 'Читаем фото…' : 'Сохранить продукт'}</Button>
    </Stack></DialogContent></Dialog>
  </div>
}

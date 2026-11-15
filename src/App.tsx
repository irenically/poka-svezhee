import { useEffect, useMemo, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'

type Place = 'fridge' | 'freezer'
type DateKind = 'label' | 'estimate'
type Item = { id: string; name: string; barcode?: string; quantity: string; place: Place; date: string; dateKind: DateKind; addedAt: string }

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
  return `${prefix} ${new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(new Date(`${item.date}T00:00:00`))}`
}

export function App() {
  const [items, setItems] = useState<Item[]>(loadItems)
  const [known, setKnown] = useState<Record<string, string>>(loadKnown)
  const [place, setPlace] = useState<Place | 'all'>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Item | null | 'new'>(null)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [quantity, setQuantity] = useState('1 шт.')
  const [itemPlace, setItemPlace] = useState<Place>('fridge')
  const [date, setDate] = useState('')
  const [dateKind, setDateKind] = useState<DateKind>('label')
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'found' | 'missing' | 'error'>('idle')
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<IScannerControls | null>(null)

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items])
  useEffect(() => localStorage.setItem(knownKey, JSON.stringify(known)), [known])
  useEffect(() => () => scannerRef.current?.stop(), [])

  const visible = useMemo(() => items.filter(item => (place === 'all' || item.place === place) && item.name.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))).sort((a, b) => urgency(a) - urgency(b) || a.name.localeCompare(b.name, 'ru')), [items, place, query])
  const urgentCount = items.filter(item => urgency(item) <= 2).length

  function openNew() {
    setEditing('new'); setName(''); setBarcode(''); setQuantity('1 шт.'); setItemPlace(place === 'freezer' ? 'freezer' : 'fridge'); setDate(''); setDateKind('label'); setLookup('idle'); setScanError('')
  }
  function openEdit(item: Item) {
    setEditing(item); setName(item.name); setBarcode(item.barcode || ''); setQuantity(item.quantity); setItemPlace(item.place); setDate(item.date); setDateKind(item.dateKind); setLookup('idle'); setScanError('')
  }
  function stopScan() {
    scannerRef.current?.stop(); scannerRef.current = null; setScanning(false)
  }
  function close() { stopScan(); setEditing(null) }

  async function findBarcode(code = barcode) {
    const normalized = code.trim().replace(/\s/g, '')
    if (!/^\d{8,14}$/.test(normalized)) { setLookup('error'); setScanError('Введите 8–14 цифр штрихкода.'); return }
    setBarcode(normalized); setScanError('')
    if (known[normalized]) { setName(known[normalized]); setLookup('found'); return }
    setLookup('loading')
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${normalized}.json?fields=product_name,product_name_ru,brands,quantity`)
      if (!response.ok) throw new Error('lookup failed')
      const data = await response.json() as { status?: string; product?: { product_name?: string; product_name_ru?: string; brands?: string; quantity?: string } }
      const product = data.product
      const result = product?.product_name_ru || product?.product_name
      if (result) {
        setName([result, product?.brands].filter(Boolean).join(' · '))
        if (product?.quantity) setQuantity(product.quantity)
        setLookup('found')
      } else setLookup('missing')
    } catch { setLookup('error'); setScanError('Не удалось связаться с базой. Название можно ввести вручную.') }
  }

  async function startScan() {
    setScanError('')
    if (!navigator.mediaDevices?.getUserMedia) { setScanError('Камера недоступна. Открой приложение по HTTPS или введи код вручную.'); return }
    try {
      setScanning(true)
      requestAnimationFrame(async () => {
        const video = videoRef.current
        if (!video) return
        try {
          const { BrowserMultiFormatReader } = await import('@zxing/browser')
          const reader = new BrowserMultiFormatReader()
          scannerRef.current = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (result) => {
            if (result) { stopScan(); void findBarcode(result.getText()) }
          })
        } catch { setScanning(false); setScanError('Камера недоступна. Разрешите доступ или введите код вручную.') }
      })
    } catch { setScanning(false); setScanError('Камера недоступна. Разрешите доступ или введите код вручную.') }
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    const item: Item = { id: editing && editing !== 'new' ? editing.id : crypto.randomUUID(), name: cleanName, barcode: barcode.trim() || undefined, quantity: quantity.trim() || '1 шт.', place: itemPlace, date, dateKind, addedAt: editing && editing !== 'new' ? editing.addedAt : new Date().toISOString() }
    setItems(current => editing === 'new' ? [item, ...current] : current.map(old => old.id === item.id ? item : old))
    if (item.barcode) setKnown(current => ({ ...current, [item.barcode!]: cleanName }))
    close()
  }
  function remove(item: Item, action: 'ate' | 'discarded') {
    if (action === 'discarded' && !window.confirm(`Убрать «${item.name}» из запасов как выброшенное?`)) return
    setItems(current => current.filter(old => old.id !== item.id))
  }

  return <div className="app-shell">
    <header className="site-header"><div className="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div><div className="brand">пока<br/>свежее<span>.</span></div><div className="header-note">Домашние запасы<br/>под рукой</div></header>
    <main>
      <section className="overview"><div><h1>Что у нас<br/><em>в запасе?</em></h1><p>{items.length === 0 ? 'Добавь первый продукт — и мы поможем вспомнить о нём вовремя.' : urgentCount ? `${urgentCount} ${urgentCount === 1 ? 'продукт ждёт' : 'продукта ждут'} внимания в ближайшие дни.` : 'Всё спокойно. Продукты под присмотром.'}</p></div><div className="overview-illustration" aria-hidden="true"><div className="shelf shelf-one"><i></i><i></i><i></i></div><div className="shelf shelf-two"><i></i><i></i></div><div className="shelf shelf-three"><i></i><i></i><i></i></div></div></section>
      <section className="inventory" aria-label="Запасы"><div className="inventory-heading"><div><h2>Мои продукты</h2><p>{items.length} в запасе</p></div><button className="add-button" onClick={openNew}><span aria-hidden="true">＋</span> Добавить</button></div>
        <div className="toolbar"><div className="tabs" role="group" aria-label="Место хранения"><button className={place === 'all' ? 'active' : ''} onClick={() => setPlace('all')}>Все</button><button className={place === 'fridge' ? 'active' : ''} onClick={() => setPlace('fridge')}>Холодильник</button><button className={place === 'freezer' ? 'active' : ''} onClick={() => setPlace('freezer')}>Морозилка</button></div><label className="search"><span className="sr-only">Поиск по запасам</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти продукт" /></label></div>
        {visible.length ? <ul className="item-list">{visible.map(item => <li className="item" key={item.id}><div className={`status-dot ${urgency(item) <= 0 ? 'late' : urgency(item) <= 2 ? 'soon' : ''}`}></div><div className="item-content"><strong>{item.name}</strong><span>{item.quantity} · {item.place === 'fridge' ? 'Холодильник' : 'Морозилка'}</span></div><div className={`item-date ${urgency(item) <= 0 ? 'late' : urgency(item) <= 2 ? 'soon' : ''}`}>{dateLabel(item)}</div><div className="item-actions"><button onClick={() => openEdit(item)} aria-label={`Изменить ${item.name}`}>Изменить</button><button onClick={() => remove(item, 'ate')} aria-label={`Отметить ${item.name} как съеденное`}>Съели</button><button className="quiet" onClick={() => remove(item, 'discarded')} aria-label={`Отметить ${item.name} как выброшенное`}>Выбросили</button></div></li>)}</ul> : <div className="empty"><div className="empty-symbol" aria-hidden="true">✳</div><h3>{items.length ? 'Ничего не нашлось' : 'Здесь пока пусто'}</h3><p>{items.length ? 'Попробуй другой запрос или раздел.' : 'Добавь продукты по названию или штрихкоду. Начнём с того, что уже лежит дома.'}</p><button onClick={openNew}>Добавить продукт</button></div>}
      </section>
    </main>
    {editing && <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-top"><div><h2 id="dialog-title">{editing === 'new' ? 'Добавить продукт' : 'Изменить продукт'}</h2><p>Пара деталей — и он под присмотром.</p></div><button className="close-button" onClick={close} aria-label="Закрыть">×</button></div><form onSubmit={save}>
      <div className="barcode-block"><div className="field-title">Штрихкод</div><div className="barcode-row"><input inputMode="numeric" value={barcode} onChange={e => { setBarcode(e.target.value); setLookup('idle') }} placeholder="Цифры под штрихкодом" aria-label="Штрихкод" /><button type="button" onClick={() => findBarcode()} disabled={lookup === 'loading'}>{lookup === 'loading' ? 'Ищем…' : 'Найти'}</button></div><button className="scan-button" type="button" onClick={scanning ? stopScan : startScan}>{scanning ? 'Остановить камеру' : 'Сканировать камерой'}</button>{scanning && <video ref={videoRef} className="camera" muted playsInline aria-label="Изображение с камеры" />}{lookup === 'found' && <p className="field-message success">Нашли товар. Проверь название и количество.</p>}{lookup === 'missing' && <p className="field-message">Такого кода пока нет в базе. Впиши название — запомним его.</p>}{scanError && <p className="field-message error">{scanError}</p>}</div>
      <label className="field"><span>Название *</span><input required value={name} onChange={e => setName(e.target.value)} placeholder="Например, огурцы или молоко" autoFocus /></label><div className="field-row"><label className="field"><span>Количество</span><input value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1 шт., 500 г…" /></label><label className="field"><span>Где хранится</span><select value={itemPlace} onChange={e => setItemPlace(e.target.value as Place)}><option value="fridge">Холодильник</option><option value="freezer">Морозилка</option></select></label></div><div className="field-row"><label className="field"><span>Дата</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label className="field"><span>Что означает дата</span><select value={dateKind} onChange={e => setDateKind(e.target.value as DateKind)}><option value="label">Срок с упаковки</option><option value="estimate">Проверить свежесть</option></select></label></div><p className="date-hint">Для овощей и других продуктов без даты выбери «Проверить свежесть». Ориентировочные сроки из справочника добавим следующим шагом.</p><button className="save-button" type="submit">Сохранить продукт</button>
    </form></section></div>}
  </div>
}

import { supabase } from './supabase'

export type Place = 'fridge' | 'freezer'
export type DateKind = 'label' | 'estimate'
export type Item = { id: string; name: string; barcode?: string; quantity: string; place: Place; date: string; dateKind: DateKind; addedAt: string }

type InventoryRow = { id: string; owner_id: string; name: string; barcode: string | null; quantity: string; place: Place; date: string | null; date_kind: DateKind; added_at: string }
const toItem = (row: InventoryRow): Item => ({ id: row.id, name: row.name, barcode: row.barcode || undefined, quantity: row.quantity, place: row.place, date: row.date || '', dateKind: row.date_kind, addedAt: row.added_at })
const toRow = (item: Item, ownerId: string) => ({ id: item.id, owner_id: ownerId, name: item.name, barcode: item.barcode || null, quantity: item.quantity, place: item.place, date: item.date || null, date_kind: item.dateKind, added_at: item.addedAt })

export async function loadCloudInventory(ownerId: string, localItems: Item[], localKnown: Record<string, string>) {
  if (localItems.length) {
    const { error } = await supabase.from('inventory_items').upsert(localItems.map(item => toRow(item, ownerId)), { onConflict: 'id' })
    if (error) throw error
  }
  const knownRows = Object.entries(localKnown).filter(([barcode]) => /^\d{8,14}$/.test(barcode)).map(([barcode, name]) => ({ owner_id: ownerId, barcode, name }))
  if (knownRows.length) {
    const { error } = await supabase.from('saved_barcodes').upsert(knownRows, { onConflict: 'owner_id,barcode' })
    if (error) throw error
  }
  const [itemsResult, knownResult] = await Promise.all([
    supabase.from('inventory_items').select('*').eq('owner_id', ownerId),
    supabase.from('saved_barcodes').select('barcode,name').eq('owner_id', ownerId),
  ])
  if (itemsResult.error) throw itemsResult.error
  if (knownResult.error) throw knownResult.error
  return {
    items: (itemsResult.data as InventoryRow[]).map(toItem),
    known: Object.fromEntries(knownResult.data.map(row => [row.barcode, row.name])) as Record<string, string>,
  }
}

export async function saveCloudItem(ownerId: string, item: Item) {
  const { error } = await supabase.from('inventory_items').upsert(toRow(item, ownerId), { onConflict: 'id' })
  if (error) throw error
  if (item.barcode) {
    const { error: knownError } = await supabase.from('saved_barcodes').upsert({ owner_id: ownerId, barcode: item.barcode, name: item.name }, { onConflict: 'owner_id,barcode' })
    if (knownError) throw knownError
  }
}

export async function deleteCloudItem(ownerId: string, itemId: string) {
  const { error } = await supabase.from('inventory_items').delete().eq('owner_id', ownerId).eq('id', itemId)
  if (error) throw error
}

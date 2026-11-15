import { supabase } from './supabase'
import type { Category } from './category'

export type Place = 'fridge' | 'freezer'
export type DateKind = 'label' | 'estimate'
export type Item = { id: string; name: string; barcode?: string; quantity: string; category: Category; place: Place; date: string; dateKind: DateKind; addedAt: string }

type InventoryRow = { id: string; owner_id: string; household_id: string | null; name: string; barcode: string | null; quantity: string; category: Category; place: Place; date: string | null; date_kind: DateKind; added_at: string }
const toItem = (row: InventoryRow): Item => ({ id: row.id, name: row.name, barcode: row.barcode || undefined, quantity: row.quantity, category: row.category || 'other', place: row.place, date: row.date || '', dateKind: row.date_kind, addedAt: row.added_at })
const toRow = (item: Item, ownerId: string, householdId: string | null) => ({ id: item.id, owner_id: ownerId, household_id: householdId, name: item.name, barcode: item.barcode || null, quantity: item.quantity, category: item.category || 'other', place: item.place, date: item.date || null, date_kind: item.dateKind, added_at: item.addedAt })

export async function loadCloudInventory(ownerId: string, householdId: string | null, localItems: Item[], localKnown: Record<string, string>) {
  if (localItems.length) {
    const { error } = await supabase.from('inventory_items').upsert(localItems.map(item => toRow(item, ownerId, householdId)), { onConflict: 'id' })
    if (error) throw error
  }
  const knownRows = Object.entries(localKnown).filter(([barcode]) => /^\d{8,14}$/.test(barcode)).map(([barcode, name]) => ({ owner_id: ownerId, barcode, name }))
  if (knownRows.length) {
    const { error } = await supabase.from('saved_barcodes').upsert(knownRows, { onConflict: 'owner_id,barcode' })
    if (error) throw error
  }
  const itemQuery = supabase.from('inventory_items').select('*')
  const [itemsResult, knownResult] = await Promise.all([
    householdId ? itemQuery.eq('household_id', householdId) : itemQuery.eq('owner_id', ownerId).is('household_id', null),
    supabase.from('saved_barcodes').select('barcode,name').eq('owner_id', ownerId),
  ])
  if (itemsResult.error) throw itemsResult.error
  if (knownResult.error) throw knownResult.error
  return {
    items: (itemsResult.data as InventoryRow[]).map(toItem),
    known: Object.fromEntries(knownResult.data.map(row => [row.barcode, row.name])) as Record<string, string>,
  }
}

export async function saveCloudItem(ownerId: string, householdId: string | null, item: Item, editing: boolean) {
  const row = toRow(item, ownerId, householdId)
  const { error } = editing
    ? await supabase.from('inventory_items').update({ name: row.name, barcode: row.barcode, quantity: row.quantity, category: row.category, place: row.place, date: row.date, date_kind: row.date_kind }).eq('id', item.id)
    : await supabase.from('inventory_items').insert(row)
  if (error) throw error
  if (item.barcode) {
    const { error: knownError } = await supabase.from('saved_barcodes').upsert({ owner_id: ownerId, barcode: item.barcode, name: item.name }, { onConflict: 'owner_id,barcode' })
    if (knownError) throw knownError
  }
}

export async function deleteCloudItem(itemId: string) {
  const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
  if (error) throw error
}

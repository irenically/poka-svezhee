import { supabase } from './supabase'

export type Household = { id: string; name: string; ownerId: string }

export async function loadHousehold(userId: string): Promise<Household | null> {
  const { data: member, error } = await supabase.from('household_members').select('household_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!member) return null
  const { data, error: householdError } = await supabase.from('households').select('id,name,owner_id').eq('id', member.household_id).single()
  if (householdError) throw householdError
  return { id: data.id, name: data.name, ownerId: data.owner_id }
}

export async function createHousehold() {
  const { error } = await supabase.rpc('create_household')
  if (error) throw error
}

export async function createInvite(): Promise<string> {
  const { data, error } = await supabase.rpc('create_household_invite')
  if (error) throw error
  return data as string
}

export async function joinHousehold(code: string) {
  const { error } = await supabase.rpc('join_household', { p_code: code.trim() })
  if (error) throw error
}

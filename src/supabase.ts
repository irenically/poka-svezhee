import { createClient } from '@supabase/supabase-js'

// This publishable key is safe to include in the browser app. Access to rows is
// controlled by the database's per-user Row Level Security policies.
export const supabase = createClient(
  'https://jmevphyxixqhysqqrgki.supabase.co',
  'sb_publishable_O8ajbbF32DwjKSTVKY_McA_YpkpXU4g',
)

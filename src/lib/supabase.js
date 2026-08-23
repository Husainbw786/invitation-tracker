// Supabase connection.
//
// These two values are the project URL and the *publishable* key. Supabase
// publishable keys are designed to ship inside the browser bundle, so they
// are not secrets: access is controlled by Row Level Security policies in the
// database, not by hiding this key. They are kept here (with an env override)
// so the app just works on every device without extra deploy configuration.
//
// To rotate the key later, set VITE_SUPABASE_URL / VITE_SUPABASE_KEY instead
// of editing this file.

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://etppyrqihcjckrvajfqe.supabase.co'
const KEY =
  import.meta.env.VITE_SUPABASE_KEY ||
  'sb_publishable_erTmxfzSmdMbJ9O8CEsSPQ_oQsNZUk3'

export const supabaseEnabled = Boolean(URL && KEY)

export const supabase = supabaseEnabled ? createClient(URL, KEY) : null

export const TABLE = 'families'

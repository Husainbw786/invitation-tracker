// One-time copy of the guest list from the old Supabase database to Firestore.
//
// Run it once per side, logged in as that side's account (the Firestore rules
// only let each account write its own side):
//
//   EMAIL=husainhackerrank@gmail.com PASSWORD='...' node scripts/migrate-from-supabase.mjs
//   EMAIL=zmalik1418@gmail.com       PASSWORD='...' node scripts/migrate-from-supabase.mjs
//
// Safe to re-run: each family keeps its Supabase id as its Firestore id, so a
// second run overwrites the same documents instead of creating duplicates.

import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db, COLLECTION } from '../src/lib/firebase.js'
import { ACCOUNTS } from '../src/lib/auth.js'

const SUPABASE_URL = 'https://etppyrqihcjckrvajfqe.supabase.co'
const SUPABASE_KEY = 'sb_publishable_erTmxfzSmdMbJ9O8CEsSPQ_oQsNZUk3'

const email = (process.env.EMAIL || '').trim().toLowerCase()
const password = process.env.PASSWORD || ''
const account = ACCOUNTS.find((a) => a.email === email)
if (!account || !password) {
  console.error('Set EMAIL (one of the app accounts) and PASSWORD. See the top of this file.')
  process.exit(1)
}

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/families?select=*&side=eq.${account.side}&order=created_at`,
  { headers: { apikey: SUPABASE_KEY } }
)
if (!res.ok) {
  console.error(`Supabase responded with HTTP ${res.status}. Is the project paused?`)
  console.error(await res.text())
  process.exit(1)
}
const rows = await res.json()
console.log(`Found ${rows.length} ${account.side} families in Supabase.`)

await signInWithEmailAndPassword(auth, email, password)

let copied = 0
for (const r of rows) {
  await setDoc(doc(db, COLLECTION, r.id), {
    side: r.side,
    name: r.name || '',
    city: r.city || '',
    phone: r.phone || '',
    members: r.members || [],
    memberTags: r.member_tags || {},
    tagCounts: r.tag_counts || {},
    tags: r.tags || [],
    maleCount: r.male_count ?? null,
    femaleCount: r.female_count ?? null,
    childCount: r.child_count ?? null,
    memberCount: r.member_count ?? null,
    gift: Boolean(r.gift),
    cardStatus: r.card_status || 'pending',
    notes: r.notes || '',
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
  })
  copied++
  console.log(`  ${copied}/${rows.length}  ${r.name} (${r.city})`)
}

console.log(`Done: copied ${copied} families to Firestore.`)
await signOut(auth)
process.exit(0)

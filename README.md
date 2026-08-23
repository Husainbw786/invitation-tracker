# invitation-tracker

💍 **Husain ♥ Zainab — Wedding Invitation Manager**

A mobile-first web app to manage physical wedding invitations. Both sides of the
wedding (Husain's family and Zainab's family) log in with their own email and
manage their own separate guest list.

## Features

- **Families** — add each invited family by surname / head of the family, with
  optional member names (or just a count) and phone number.
- **Tags** — create your own tags (`all`, `main function`, `mamera`, …); tag
  counts show on the dashboard and every tag is clickable to filter.
- **Cities** — the most important filter: the dashboard shows a card per city
  with family/guest counts and delivery progress; click it to see every detail.
- **Card status** — track each physical card: Pending → Card Written → Delivered.
- **Gifts** — mark which families get a gift; total shown on the dashboard.
- **Login by side** — each side's email sees only its own list.
- **Export & print** — CSV export and a print-friendly per-city delivery checklist.

## Run locally

```bash
npm install
npm run dev
```

## Logins

Accounts are defined in [`src/lib/auth.js`](src/lib/auth.js) — edit that file to
change emails/passwords or add more accounts for relatives (each account is
assigned to one side: `husain` or `zainab`).

## Data

Families are stored in **Supabase** (hosted Postgres) in a single `families`
table, and sync live to every device: add a family on one phone and it appears
on the others within a second, no refresh.

Each row carries a `side` column (`husain` / `zainab`) and the app only ever
queries its own side, so the two families keep separate guest lists.

The schema lives in [`supabase-schema.sql`](supabase-schema.sql).

### Two things to know

1. **Access is open.** The app logs in with a hardcoded check in the browser, so
   Postgres cannot verify who is asking and the Row Level Security policy must
   allow the publishable key full access. Anyone who knows the site URL can read
   or delete the guest list. Keep the URL private, and use **Export CSV**
   occasionally as a backup. To lock it down properly, switch to Supabase Auth
   and change the policy to `using (auth.uid() is not null)`.
2. **Free projects pause after 7 days idle.** A GitHub Action
   ([`keep-supabase-awake.yml`](.github/workflows/keep-supabase-awake.yml)) pings
   the database every 3 days to prevent that. If the app ever shows no data,
   check whether the project was paused in the Supabase dashboard.

## Deploy

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Vercel / Netlify / GitHub Pages).

## Tech

React + Vite · localStorage · no backend, no other dependencies.

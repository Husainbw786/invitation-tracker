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

All data is saved in the browser (localStorage) on the device where it was
entered. It survives reloads and works offline, but is **not shared between
devices** — each phone/laptop keeps its own list. Use **Export CSV** to move or
back up the list.

## Deploy

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Vercel / Netlify / GitHub Pages).

## Tech

React + Vite · localStorage · no backend, no other dependencies.

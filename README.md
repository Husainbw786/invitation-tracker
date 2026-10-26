# invitation-tracker

💍 **Husain ♥ Zainab — Wedding Invitation Manager**

A mobile-first web app to manage physical wedding invitations. Both sides of the
wedding (Husain's family and Zainab's family) log in with their own email and
manage their own separate guest list.

## Features

- **Families** — add each invited family by surname / head of the family, with
  optional member names (or just a count) and phone number.
- **Pick from phone contacts** — on Android, tap **Contacts** next to the phone
  box to choose the family from the phone's contacts; the name and number are
  filled in. Members can be picked from contacts the same way, several at once.
- **Tags** — create your own tags (`all`, `main function`, `mamera`, …); tag
  counts show on the dashboard and every tag is clickable to filter.
- **Cities** — the most important filter: the dashboard shows a card per city
  with family/guest counts and delivery progress; click it to see every detail.
- **Card status** — track each physical card: Pending → Card Written → Delivered.
- **Gifts** — mark which families get a gift; total shown on the dashboard.
- **Login by side** — each side's email sees only its own list.
- **Export & print** — CSV export and a print-friendly per-city delivery checklist.
- **Install as an app** — tap **Install App** (Chrome on Android/desktop) to put
  it on the home screen; it opens full-screen like a normal app. On iPhone use
  Safari → Share → **Add to Home Screen**.

## Run locally

```bash
npm install
npm run dev
```

## Logins

Logins use **Firebase Authentication** (email + password). The two accounts are
listed in [`src/lib/auth.js`](src/lib/auth.js), each assigned to one side
(`husain` or `zainab`). Passwords are set in the Firebase console under
**Security → Authentication → Users**, never in the code.

To add an account for a relative: create the user in the Firebase console, add
the email to `ACCOUNTS` in `src/lib/auth.js`, and add the same email to the map
in [`firestore.rules`](firestore.rules).

## Data

Families are stored in **Cloud Firestore** (Firebase project
`wedding-invites-8e5ff`), one document per family in the `families`
collection. Changes sync live to every device: add a family on one phone and it
appears on the others within a second, no refresh. The free Spark plan never
pauses, however long the app goes unused.

Each document carries a `side` field (`husain` / `zainab`). The security rules
in [`firestore.rules`](firestore.rules) only let a logged-in account read and
write its own side, so the two families keep separate, private guest lists.
After changing that file, paste it into **Firestore Database → Rules** and
click **Publish**.

## Phone contacts (Android)

The **Contacts** buttons in the Add Family form use the browser's Contact
Picker API. Tapping one opens Android's own contact picker:

1. The first time, the browser asks for the phone's **Contacts** permission.
2. The picker lists the phone's contacts; the user ticks who they want.
3. Only the ticked contacts reach the app. The rest of the address book is
   never read, and nothing is uploaded until the family is saved.

The picker reads the phone's shared contact store, which every contacts app
writes to (Google Contacts, Samsung Contacts, Mi Contacts, SIM contacts,
contacts synced by WhatsApp and so on), so it works whichever contacts app the
phone uses.

Requirements:

- **Chrome or Samsung Internet on Android** (any Chromium browser). The buttons
  are hidden on desktop and iPhone, where the API does not exist. On an Android
  browser without it (Firefox), tapping the button explains to use Chrome.
- **HTTPS.** The deployed site is fine. When testing from a phone against the
  dev server over plain `http://192.168…`, the browser hides the API; either
  open the site through an HTTPS tunnel, or enable
  `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for that address.
- If the permission was denied earlier, the picker returns nothing. Allow
  **Contacts** for the browser under Android Settings › Apps › Chrome ›
  Permissions and tap the button again (the form says this too).

The code is in [`src/lib/contacts.js`](src/lib/contacts.js).

## Deploy

```bash
npm run build
```

Deploy the `dist/` folder to any static host (Vercel / Netlify / GitHub Pages).
The live site is hosted on Vercel, which builds and deploys `main` automatically
after every merge.

## Tech

React + Vite · Firebase (Auth + Firestore) · no backend of our own.

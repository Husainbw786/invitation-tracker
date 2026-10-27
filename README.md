# invitation-tracker

💍 **Husain ♥ Zainab — Wedding Invitation Manager**

A mobile-first web app to manage physical wedding invitations. Both sides of the
wedding (Husain's family and Zainab's family) log in with their own email and
manage their own separate guest list.

## Features

- **Families** — add each invited family by surname / head of the family, with
  optional member names (or just a count) and phone number.
- **From phone contacts** — on Android, share a person from the phone's
  Contacts app to **Invitations** and the Add Family form opens with their name
  and number filled in (share several people at once and the rest become
  members). There is also a **Contacts** button next to the phone box that
  opens Chrome's contact picker, where Chrome supports it.
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

### Share a contact into the app (works with every contacts app)

1. In the phone's Contacts app, open the person and tap **Share** (on some
   phones: the three-dot menu, then Share, then "vCard file").
2. Choose **Invitations** in the share sheet.
3. The app opens the Add Family form with the name and first number filled in,
   and a green line saying what was taken. Sharing several people at once makes
   the first the head of the family and the rest members.

This uses the installed app's share target (`share_target` in
[`public/manifest.webmanifest`](public/manifest.webmanifest)): the service
worker receives the shared vCard, keeps it in the cache and sends the app to
`/?shared-contact=1`, where [`src/lib/share.js`](src/lib/share.js) reads it
once and [`src/lib/vcard.js`](src/lib/vcard.js) pulls out the name and
numbers (vCard 2.1 and 3.0, including the quoted-printable names Samsung
phones write). Plain-text shares ("Name / number") are understood too.

It needs the app to be **installed from Chrome** (Install App). Chrome refreshes
an installed app's manifest about once a day, so after this change
**Invitations** may take a day to appear in the share sheet; to get it at once,
uninstall the app and install it again from Chrome.

### The Contacts button (Chrome's contact picker)

The **Contacts** buttons in the Add Family form use the browser's Contact
Picker API. Tapping one opens a contact picker:

1. The first time, the browser asks for the phone's **Contacts** permission.
2. The picker lists the phone's contacts; the user ticks who they want and
   taps **Done**. On newer Android versions Chrome opens the phone's own
   contacts app first and then shows a short confirmation sheet of its own
   (name and number chips); tap **Done** there as well.
3. Only the ticked contacts reach the app. The rest of the address book is
   never read, and nothing is uploaded until the family is saved.

The picked contact's name and first number are filled into the form straight
away and a green line under the phone box confirms what was taken (with an
**Undo name** link when a name that was already typed got replaced). If nothing
came back, a red line says so and what to try.

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
- To see exactly what the phone handed over, plug it in, open
  `chrome://inspect` on a computer, and look for "Contact picker returned" in
  the console.
- **Known Chrome bug.** On the newest Android versions Chrome opens the phone's
  own Contacts app for the pick, which sends the web app to the background, and
  Chrome then cancels the pick as soon as that happens, so the chosen contact
  never arrives (Chrome's `ContactsPicker` tears the picker down whenever the
  tab is hidden). The form detects this and points to the share route above,
  which does not depend on the picker at all.

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

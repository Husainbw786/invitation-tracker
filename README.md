# invitation-tracker

**Invitations** — guest lists for weddings, birthdays and every other event.

A mobile-first web app to manage invitations. Anyone can create an account,
make an event, track who is invited and whether their card or message went
out, and share the list with family who help.

## Features

- **Accounts** — sign up with email and password, or continue with Google.
  Forgot-password link on the sign-in screen.
- **Events** — each account can have many events, each with its own guest
  list. Types: wedding, engagement, birthday, anniversary, aqiqah / naming,
  housewarming, baby shower, religious gathering, Eid / festival, office,
  party, or anything else. The type only fills in starting settings
  ([`src/lib/eventTypes.js`](src/lib/eventTypes.js)); the owner changes them
  in **Event settings**:
  - one row is a **family** (with members) or a single **guest**
  - the **invitation steps** (Pending → Card Written → Delivered, Not sent →
    Sent, or your own, 2 to 5 steps)
  - **functions / tags** offered when adding a row
  - **gifts** on or off, and what to call them ("Gift", "Return gift")
  - whether **city** is required
- **Helpers** — the owner adds people by email as **Editor** (add and change
  guests) or **Viewer** (only look). They sign in with that email and tap
  **Join**. Email accounts verify their address first; Google accounts are
  verified already. The **Share** button sends them the link.
- **Rows** — name, city, phone, members (or just men / women / children
  counts), tags with per-member or per-tag attendance, gift, status, notes.
- **RSVP** — turn it on per event, then send each row a private link on
  WhatsApp (or copy it). Guests answer without an account: coming / maybe /
  not coming, how many people, which functions, and a message. Answers show
  live in the list and on the dashboard (people coming in total and per
  function). Hosts can note answers given by phone, set a last day to reply,
  and make a new link if one went to the wrong person.
- **Dashboard** — invitations done vs to go, headcount, gifts, a card per city
  with progress, and headcount per tag. Everything is clickable to filter.
- **Export & print** — CSV export and a print-friendly per-city checklist.
- **From phone contacts** — share a contact from the phone's Contacts app to
  **Invitations**, or use the **Contacts** button in the form (see below).
- **Install as an app** — tap **Install App** (Chrome on Android/desktop) to put
  it on the home screen. On iPhone use Safari → Share → **Add to Home Screen**.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` talks to the **live** Firebase project. To try things without
touching real data, run the Firebase emulators (needs Java 21+) in one
terminal and the app against them in another:

```bash
npm run emulators
npm run dev:local
```

The emulator UI (accounts, data) is at http://127.0.0.1:4005. Its data is
thrown away when it stops.

## Data

Stored in **Cloud Firestore** (Firebase project `wedding-invites-8e5ff`).
Changes sync live to every device.

```
events/{eventId}                name, subtitle, type, date, venue, settings,
                                ownerId, memberIds, members { uid: { role, name, email } },
                                invitedEmails, inviteRoles { email: role }
events/{eventId}/guests/{id}    one row: name, city, phone, members, counts,
                                tags, gift, cardStatus, notes, createdAt
events/{eventId}/public/card    what RSVP pages show: name, date, venue, host,
                                whether replies are open (owner writes it)
events/{eventId}/rsvps/{token}  one RSVP link: guestId, guestName, invited,
                                functions, response { status, people, ... }
```

An RSVP link looks like `/#/r/{eventId}/{token}`. The long random token is the
secret: with it a guest can read only that one RSVP and the event's public
card, and answer while replies are open. Never the guest list.

The security rules in [`firestore.rules`](firestore.rules) decide who can do
what: owners change everything, editors add / edit / delete rows, viewers only
read, RSVP links reach only their own answer, and nobody else sees anything. Publish them with
`npm run rules:deploy` (after `npx firebase-tools login`), or paste the file
into **Firestore Database → Rules** and click **Publish**.

### The original wedding list

Before events existed, the app was one wedding with two sides, stored in the
top-level `families` collection. The first time each of those two accounts
signs in, [`src/lib/migrate.js`](src/lib/migrate.js) copies its side into its
own event (`events/legacy-husain`, `events/legacy-zainab`) with the same
wording and order. The old documents are left untouched as a backup.
Once both lists have moved, delete the "original wedding list" block at the
end of `firestore.rules` and publish the rules again.

## Firebase console setup

- **Authentication → Sign-in method**: Email/Password on, and **Google** on.
- **Authentication → Settings → User actions**: "Enable create (sign-up)"
  must be ticked, or nobody can make an account.
- **Authentication → Settings → Authorized domains**: the site's domain
  (for example the Vercel domain) must be listed for Google sign-in.
- **Authentication → Templates**: the verification and password-reset mails
  can be given the app's name there.

## Phone contacts (Android)

### Share a contact into the app (works with every contacts app)

1. In the phone's Contacts app, open the person and tap **Share** (on some
   phones: the three-dot menu, then Share, then "vCard file").
2. Choose **Invitations** in the share sheet.
3. The app opens the Add form with the name and first number filled in,
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

The **Contacts** buttons in the Add form use the browser's Contact
Picker API. Tapping one opens a contact picker:

1. The first time, the browser asks for the phone's **Contacts** permission.
2. The picker lists the phone's contacts; the user ticks who they want and
   taps **Done**. On newer Android versions Chrome opens the phone's own
   contacts app first and then shows a short confirmation sheet of its own
   (name and number chips); tap **Done** there as well.
3. Only the ticked contacts reach the app. The rest of the address book is
   never read, and nothing is uploaded until the row is saved.

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
after every merge. Publish `firestore.rules` **before** merging a change that
needs new rules.

## Tech

React + Vite · Firebase (Auth + Firestore) · no backend of our own.

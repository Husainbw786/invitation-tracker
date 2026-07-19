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

Without any configuration the app runs in **local mode**: data is stored in the
browser (localStorage) and login uses the built-in accounts in
`src/lib/auth.js`. Good for trying it out on one device.

## Go live (shared data for the whole family) — Firebase

1. Create a free project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method**: enable *Email/Password*, then under
   *Users* add the two accounts (Husain's and Zainab's emails with proper passwords).
3. **Firestore Database**: create a database, then paste the contents of
   [`firestore.rules`](firestore.rules) under the *Rules* tab.
4. **Project settings → Your apps → Web app**: register an app and copy the
   config values into a `.env` file (see [`.env.example`](.env.example)).
5. `npm run build` and deploy the `dist/` folder anywhere (Vercel / Netlify free
   tier). Set the same env vars in the hosting dashboard.

To give more relatives access, add their email in **two places**: Firebase
Authentication (create the user) and `SIDE_BY_EMAIL` in
[`src/lib/auth.js`](src/lib/auth.js) (which side they belong to).

## Tech

React + Vite · Firebase Auth + Firestore (with localStorage fallback) · no other dependencies.

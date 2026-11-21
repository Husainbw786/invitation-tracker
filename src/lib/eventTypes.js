// Event types and the wording that follows from an event's settings.
//
// A type only fills in starting settings when an event is created. After that
// everything lives on the event itself (event.settings) and can be changed in
// Event Settings, so no screen has special code for a particular type.

import {
  Baby,
  Briefcase,
  Cake,
  Champagne,
  Diamond,
  FlowerLotus,
  HandsPraying,
  Heart,
  HeartStraight,
  House,
  MoonStars,
  Sparkle,
} from '@phosphor-icons/react'

// Status steps. The first step is always `pending` and the last always
// `delivered`, so "how many are done" works the same for every event, and
// guests copied over from the old wedding list keep their status as is.
export const STEP_PRESETS = {
  cards: {
    label: 'Printed cards',
    inviteWord: 'card',
    steps: [
      { id: 'pending', label: 'Pending' },
      { id: 'written', label: 'Card Written' },
      { id: 'delivered', label: 'Delivered' },
    ],
  },
  messages: {
    label: 'Message or call',
    inviteWord: 'invite',
    steps: [
      { id: 'pending', label: 'Not sent' },
      { id: 'delivered', label: 'Sent' },
    ],
  },
  personal: {
    label: 'In person',
    inviteWord: 'invite',
    steps: [
      { id: 'pending', label: 'Pending' },
      { id: 'delivered', label: 'Done' },
    ],
  },
}

// What one row of the list is called, and what the people in it are called.
export const GUEST_WORDS = {
  family: {
    one: 'family',
    many: 'families',
    One: 'Family',
    Many: 'Families',
    headOne: 'guest',
    headMany: 'guests',
    nameLabel: 'Family surname / head of family',
    namePlaceholder: 'e.g. Shaikh Family (Abbas Bhai)',
  },
  guest: {
    one: 'guest',
    many: 'guests',
    One: 'Guest',
    Many: 'Guests',
    headOne: 'person',
    headMany: 'people',
    nameLabel: 'Guest name',
    namePlaceholder: 'e.g. Sara Khan',
  },
}

function type(label, icon, caption, s) {
  return { label, icon, caption, ...s }
}

// `tags` are the functions / sub-events offered in the guest form.
export const EVENT_TYPES = {
  wedding: type('Wedding', Heart, 'the big day', {
    guestWord: 'family',
    steps: 'cards',
    tags: ['mehndi', 'haldi', 'nikah', 'reception'],
    gifts: { on: true, label: 'Gift' },
    cityRequired: true,
    namePlaceholder: 'e.g. Ayaan & Sara',
    subtitlePlaceholder: "e.g. Groom's family",
  }),
  engagement: type('Engagement', Diamond, 'she said yes', {
    guestWord: 'family',
    steps: 'cards',
    tags: ['ring ceremony', 'dinner'],
    gifts: { on: true, label: 'Gift' },
    cityRequired: true,
    namePlaceholder: 'e.g. Ayaan & Sara',
    subtitlePlaceholder: "e.g. Bride's family",
  }),
  birthday: type('Birthday', Cake, 'make a wish', {
    guestWord: 'guest',
    steps: 'messages',
    tags: [],
    gifts: { on: false, label: 'Return gift' },
    cityRequired: false,
    namePlaceholder: "e.g. Zoya's 5th Birthday",
    subtitlePlaceholder: 'e.g. Saturday evening party',
  }),
  anniversary: type('Anniversary', HeartStraight, 'still us', {
    guestWord: 'guest',
    steps: 'messages',
    tags: [],
    gifts: { on: false, label: 'Gift' },
    cityRequired: false,
    namePlaceholder: "e.g. Mom & Dad's 25th",
    subtitlePlaceholder: 'e.g. Silver jubilee',
  }),
  aqiqah: type('Aqiqah / Naming', Baby, 'welcome, little one', {
    guestWord: 'family',
    steps: 'personal',
    tags: [],
    gifts: { on: true, label: 'Gift' },
    cityRequired: true,
    namePlaceholder: "e.g. Baby Ali's Aqiqah",
    subtitlePlaceholder: "e.g. Father's side",
  }),
  housewarming: type('Housewarming', House, 'home sweet home', {
    guestWord: 'family',
    steps: 'messages',
    tags: ['prayer', 'lunch'],
    gifts: { on: false, label: 'Gift' },
    cityRequired: false,
    namePlaceholder: 'e.g. Our new home',
    subtitlePlaceholder: 'e.g. Flat 402, Sea View',
  }),
  baby_shower: type('Baby shower', FlowerLotus, 'baby on the way', {
    guestWord: 'guest',
    steps: 'messages',
    tags: [],
    gifts: { on: false, label: 'Return gift' },
    cityRequired: false,
    namePlaceholder: "e.g. Sara's Baby Shower",
    subtitlePlaceholder: 'e.g. Ladies only',
  }),
  religious: type('Religious gathering', HandsPraying, 'together in prayer', {
    guestWord: 'family',
    steps: 'personal',
    tags: [],
    gifts: { on: false, label: 'Gift' },
    cityRequired: true,
    namePlaceholder: 'e.g. Niyaz at our home',
    subtitlePlaceholder: 'e.g. After Isha',
  }),
  eid: type('Eid / festival', MoonStars, 'festive days', {
    guestWord: 'family',
    steps: 'messages',
    tags: [],
    gifts: { on: false, label: 'Gift' },
    cityRequired: false,
    namePlaceholder: 'e.g. Eid dinner',
    subtitlePlaceholder: 'e.g. Second day of Eid',
  }),
  corporate: type('Office / corporate', Briefcase, 'team time', {
    guestWord: 'guest',
    steps: 'messages',
    tags: [],
    gifts: { on: false, label: 'Gift' },
    cityRequired: false,
    namePlaceholder: 'e.g. Annual dinner 2027',
    subtitlePlaceholder: 'e.g. Sales team',
  }),
  party: type('Party / get-together', Champagne, "let's celebrate", {
    guestWord: 'guest',
    steps: 'messages',
    tags: [],
    gifts: { on: false, label: 'Gift' },
    cityRequired: false,
    namePlaceholder: 'e.g. New Year party',
    subtitlePlaceholder: 'e.g. Rooftop, 8 pm',
  }),
  custom: type('Something else', Sparkle, 'our event', {
    guestWord: 'guest',
    steps: 'personal',
    tags: [],
    gifts: { on: false, label: 'Gift' },
    cityRequired: false,
    namePlaceholder: 'e.g. Reunion 2027',
    subtitlePlaceholder: 'A short line under the name',
  }),
}

export function eventType(event) {
  return EVENT_TYPES[event?.type] || EVENT_TYPES.custom
}

/** Settings for a new event of this type. */
export function defaultSettings(typeId) {
  const t = EVENT_TYPES[typeId] || EVENT_TYPES.custom
  const preset = STEP_PRESETS[t.steps]
  return {
    guestWord: t.guestWord,
    statusSteps: preset.steps.map((s) => ({ ...s })),
    inviteWord: preset.inviteWord,
    tagPresets: [...t.tags],
    gifts: { ...t.gifts },
    cityRequired: t.cityRequired,
  }
}

// ---------------------------------------------------------------- wording

/** Everything the screens need to word an event, with safe fallbacks. */
export function wordsFor(event) {
  const s = event?.settings || {}
  const guest = GUEST_WORDS[s.guestWord] || GUEST_WORDS.guest
  const steps =
    Array.isArray(s.statusSteps) && s.statusSteps.length >= 2
      ? s.statusSteps
      : STEP_PRESETS.personal.steps
  const done = steps[steps.length - 1]
  const giftLabel = (s.gifts?.label || 'Gift').trim() || 'Gift'
  const inviteWord = s.inviteWord === 'card' ? 'card' : 'invite'
  return {
    ...guest,
    steps,
    done,
    doneVerb: done.label.toLowerCase(), // "delivered", "sent"
    inviteWord, // "card" | "invite"
    inviteWords: `${inviteWord}s`,
    InviteWord: inviteWord === 'card' ? 'Card' : 'Invite',
    giftsOn: Boolean(s.gifts?.on),
    gift: giftLabel, // "Gift" / "Return gift"
    gifts: `${giftLabel}s`,
    cityRequired: s.cityRequired !== false,
    tagPresets: Array.isArray(s.tagPresets) ? s.tagPresets : [],
    rsvpOn: Boolean(s.rsvp?.on), // guests can answer through a link (rsvp.js)
    rsvpCloses: s.rsvp?.closes || '', // last day to answer, 'YYYY-MM-DD' or ''
  }
}

export function stepLabel(words, id) {
  return (words.steps.find((s) => s.id === id) || words.steps[0]).label
}

/** Guests with a status that no longer exists count as the first step. */
export function stepOf(words, id) {
  return words.steps.some((s) => s.id === id) ? id : words.steps[0].id
}

export function nextStep(words, id) {
  const i = words.steps.findIndex((s) => s.id === stepOf(words, id))
  return words.steps[(i + 1) % words.steps.length].id
}

/** Colour of a status: the first step 'pending', the last 'done', anything between 'progress'. */
export function stepTone(words, id) {
  const sid = stepOf(words, id)
  if (sid === words.steps[0].id) return 'pending'
  if (sid === words.done.id) return 'done'
  return 'progress'
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

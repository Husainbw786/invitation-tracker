// Minimal vCard reader: enough to take a name and phone numbers out of what
// Android contacts apps share (vCard 2.1 and 3.0, one card or several).
// Photos and everything else are ignored.

// Long values are folded onto continuation lines that start with a space or
// tab; join them back before parsing.
function unfold(text) {
  return String(text)
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/\n[ \t]/g, '')
}

// vCard 2.1 writes non-ASCII text as quoted-printable UTF-8 (=E0=A4=85...).
function decodeQuotedPrintable(value) {
  const bytes = []
  for (let i = 0; i < value.length; i++) {
    const hex = value.slice(i + 1, i + 3)
    if (value[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16))
      i += 2
    } else {
      bytes.push(value.charCodeAt(i) & 0xff)
    }
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
  } catch {
    return value
  }
}

function unescapeText(value) {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseLine(line) {
  const colon = line.indexOf(':')
  if (colon < 0) return null
  const [rawName, ...rawParams] = line.slice(0, colon).split(';')
  const name = rawName.replace(/^item\d+\./i, '').trim().toUpperCase()
  const params = rawParams.map((p) => p.trim().toUpperCase())
  let value = line.slice(colon + 1)
  if (params.some((p) => p === 'ENCODING=QUOTED-PRINTABLE' || p === 'QUOTED-PRINTABLE')) {
    value = decodeQuotedPrintable(value)
  }
  return { name, params, value }
}

// Two spellings of one number ("+91 98200 11223", "98200-11223") compare
// equal: the digits, and for full-length numbers just the last ten, so a
// country code or trunk prefix makes no difference.
export function phoneKey(tel) {
  const digits = String(tel).replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

// Preferred number first, then mobiles, then the rest, without duplicates.
function orderPhones(tels) {
  const rank = (t) => (t.pref ? 0 : t.cell ? 1 : 2)
  const sorted = tels.map((t, i) => ({ ...t, i })).sort((a, b) => rank(a) - rank(b) || a.i - b.i)
  const seen = new Set()
  const out = []
  for (const t of sorted) {
    const key = phoneKey(t.tel)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(t.tel)
  }
  return out
}

/** Every card in the text as { name, phones }. Cards with nothing usable are kept out. */
export function parseVCards(text) {
  const cards = []
  let card = null
  for (const line of unfold(text).split('\n')) {
    const p = parseLine(line)
    if (!p) continue
    if (p.name === 'BEGIN' && p.value.trim().toUpperCase() === 'VCARD') {
      card = { fn: '', n: '', tels: [] }
      continue
    }
    if (!card) continue
    if (p.name === 'END') {
      cards.push(card)
      card = null
    } else if (p.name === 'FN') {
      card.fn = unescapeText(p.value)
    } else if (p.name === 'N') {
      // Family;Given;Additional;Prefix;Suffix, shown in speaking order.
      const parts = p.value.split(';').map(unescapeText)
      card.n = [parts[3], parts[1], parts[2], parts[0], parts[4]].filter(Boolean).join(' ')
    } else if (p.name === 'TEL') {
      const tel = unescapeText(p.value)
      if (!tel) continue
      const flags = p.params.join(';')
      card.tels.push({
        tel,
        pref: /(^|;|=|,)PREF(;|=|,|$)/.test(flags),
        cell: /CELL|MOBILE/.test(flags),
      })
    }
  }
  if (card) cards.push(card) // a card without END is still a card
  return cards
    .map((c) => ({ name: c.fn || c.n, phones: orderPhones(c.tels) }))
    .filter((c) => c.name || c.phones.length)
}

/**
 * A contact out of plain shared text (some contacts apps share "Name /
 * +91 98200 11223" as text instead of a vCard).
 */
export function contactFromText(title, text) {
  const body = [title, text].filter(Boolean).join('\n')
  const phones = orderPhones(
    [...body.matchAll(/\+?\d[\d\s().-]{6,}\d/g)].map((m) => ({ tel: unescapeText(m[0]) }))
  )
  const name =
    body
      .split('\n')
      .map((l) => l.replace(/^(name|contact|phone|mobile|tel|number)\s*[:：-]\s*/i, '').trim())
      .find((l) => l && !/\d{5,}/.test(l)) || ''
  return { name, phones }
}

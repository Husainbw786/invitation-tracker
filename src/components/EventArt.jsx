import { EVENT_TYPES, eventType } from '../lib/eventTypes.js'

/** The event type's colour key (styles in coral-app.css). */
export function toneOf(event) {
  return EVENT_TYPES[event?.type] ? event.type : 'custom'
}

/** A rounded square with the event type's icon on its own soft colour. */
export default function EventIcon({ event, size }) {
  const Icon = eventType(event).icon
  return (
    <span className={size === 'sm' ? 'event-icon event-icon-sm' : 'event-icon'} aria-hidden="true" data-tone={toneOf(event)}>
      <Icon weight="duotone" />
    </span>
  )
}

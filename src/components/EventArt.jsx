import { eventType } from '../lib/eventTypes.js'

/** A rounded square with the event type's icon on a soft tint. */
export default function EventIcon({ event, size }) {
  const Icon = eventType(event).icon
  return (
    <span className={size === 'sm' ? 'event-icon event-icon-sm' : 'event-icon'} aria-hidden="true">
      <Icon weight="duotone" />
    </span>
  )
}

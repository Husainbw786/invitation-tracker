import { eventType } from '../lib/eventTypes.js'

// Photos an event can carry instead of its type's icon. Only the events moved
// over from the original wedding list use one today.
const PHOTOS = {
  couple: '/couple-art2.jpeg',
}

/** A rounded square with the event's photo, or its type's icon on a soft tint. */
export default function EventIcon({ event, size }) {
  const photo = PHOTOS[event?.art]
  const Icon = eventType(event).icon
  return (
    <span className={size === 'sm' ? 'event-icon event-icon-sm' : 'event-icon'} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : <Icon weight="duotone" />}
    </span>
  )
}

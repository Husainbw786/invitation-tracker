import { useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'

// Bottom sheet on phones, centred dialog on wider screens. Closes on Escape
// and on a click on the backdrop (but not when a text selection dragged out
// of an input is released there). With `onSubmit` the sheet is a <form>.
export default function Modal({ title, onClose, onSubmit, children }) {
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const Sheet = onSubmit ? 'form' : 'div'
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
        pressedOnBackdrop.current = false
      }}
    >
      <Sheet className="modal" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </Sheet>
    </div>
  )
}

// A page's main action (STYLE.md § Main action): a slot at the right of the
// page head that the page fills, so the action sits where the eye lands and
// the page decides what it is from its own state. One primary at most;
// secondary actions beside it.

import { createContext, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const SlotContext = createContext<{ slot: HTMLElement | null, set_slot: (slot: HTMLElement | null) => void }>({ slot: null, set_slot: () => {} })

export const PageActionsProvider = ({ children }: { children: ReactNode }) => {
  const [slot, set_slot] = useState<HTMLElement | null>(null)
  return <SlotContext.Provider value={{ slot, set_slot }}>{children}</SlotContext.Provider>
}

// Rendered by the page head.
export const PageActionsSlot = ({ className }: { className?: string | undefined }) => {
  const { set_slot } = useContext(SlotContext)
  return <div ref={set_slot} className={className} data-testid='page-actions' />
}

// Rendered by a page: its actions, moved into the head.
export const PageActions = ({ children }: { children: ReactNode }) => {
  const { slot } = useContext(SlotContext)
  return slot === null ? null : createPortal(children, slot)
}

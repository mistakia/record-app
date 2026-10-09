// Toasts: short messages about the outcome of an action, dismissed by the
// user or after a few seconds. Text from the node is shown as plain text.

import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

import type { NodeApiTag } from './event-invalidation.ts'

// What a toast's button does, as data so it can sit in the store: go to a
// route, or refetch some of the node's data.
export interface ToastAction {
  label: string
  route?: string
  invalidate?: NodeApiTag[]
}

export interface Notification {
  id: string
  kind: 'info' | 'error'
  message: string
  // Seated on the toast's top stroke, as an event's name.
  title?: string
  action?: ToastAction
  // A toast with the same key replaces the one showing, so a burst of
  // events raises one toast.
  key?: string
}

type NotificationInput = Omit<Notification, 'id'>

const MAX_NOTIFICATIONS = 5

export const notifications_slice = createSlice({
  name: 'notifications',
  initialState: { items: [] as Notification[] },
  reducers: {
    notified: {
      reducer: (state, action: PayloadAction<Notification>) => {
        const { key } = action.payload
        const kept = key === undefined ? state.items : state.items.filter((item) => item.key !== key)
        state.items = [...kept, action.payload].slice(-MAX_NOTIFICATIONS)
      },
      prepare: (input: NotificationInput) => ({ payload: { id: nanoid(), ...input } })
    },
    dismissed: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(({ id }) => id !== action.payload)
    }
  }
})

export const { notified, dismissed } = notifications_slice.actions

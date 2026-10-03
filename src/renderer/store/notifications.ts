// Toasts: short messages about the outcome of an action, dismissed by the
// user or after a few seconds. Text from the node is shown as plain text.

import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export interface Notification {
  id: string
  kind: 'info' | 'error'
  message: string
}

const MAX_NOTIFICATIONS = 5

export const notifications_slice = createSlice({
  name: 'notifications',
  initialState: { items: [] as Notification[] },
  reducers: {
    notified: {
      reducer: (state, action: PayloadAction<Notification>) => {
        state.items = [...state.items, action.payload].slice(-MAX_NOTIFICATIONS)
      },
      prepare: ({ kind, message }: { kind: Notification['kind'], message: string }) => ({ payload: { id: nanoid(), kind, message } })
    },
    dismissed: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(({ id }) => id !== action.payload)
    }
  }
})

export const { notified, dismissed } = notifications_slice.actions

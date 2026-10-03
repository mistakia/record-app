import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import { node_api } from './api.ts'
import { bundled_slice } from './bundled.ts'
import { connection_slice } from './connection.ts'
import { imports_slice } from './imports.ts'
import { notifications_slice } from './notifications.ts'
import { player_slice } from './player.ts'
import { replication_slice } from './replication.ts'
import { ui_slice } from './ui.ts'

export const store = configureStore({
  reducer: {
    [node_api.reducerPath]: node_api.reducer,
    bundled: bundled_slice.reducer,
    connection: connection_slice.reducer,
    imports: imports_slice.reducer,
    notifications: notifications_slice.reducer,
    player: player_slice.reducer,
    replication: replication_slice.reducer,
    ui: ui_slice.reducer
  },
  middleware: (get_default_middleware) => get_default_middleware().concat(node_api.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const use_app_dispatch = useDispatch.withTypes<AppDispatch>()
export const use_app_selector = useSelector.withTypes<RootState>()

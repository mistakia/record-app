import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'

import { node_api } from './api.ts'
import { connection_slice } from './connection.ts'
import { player_slice } from './player.ts'

export const store = configureStore({
  reducer: {
    [node_api.reducerPath]: node_api.reducer,
    connection: connection_slice.reducer,
    player: player_slice.reducer
  },
  middleware: (get_default_middleware) => get_default_middleware().concat(node_api.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const use_app_dispatch = useDispatch.withTypes<AppDispatch>()
export const use_app_selector = useSelector.withTypes<RootState>()

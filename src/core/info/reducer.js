import { Map, List } from 'immutable'
import { infoActions } from '@core/info'

export const initialState = new Map({
  state: null,
  peers: new List(),
  subs: new Map(),
  bitswap: new Map(),
  repo: new Map()
})

export function infoReducer (state = initialState, { payload, type }) {
  switch (type) {
    case infoActions.INFO_INIT_FULFILLED:
      return state.withMutations(state => {
        state.merge({
          subs: new Map(payload.subs),
          bitswap: new Map(payload.bitswap),
          repo: new Map(payload.repo)
        })
      })

    default:
      return state
  }
}

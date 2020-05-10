import { Map } from 'immutable'
import { infoActions } from '@core/info'

export const initialState = new Map({
  subs: new Map(),
  bw: new Map(),
  repo: new Map()
})

export function infoReducer (state = initialState, { payload, type }) {
  switch (type) {
    case infoActions.INFO_INIT_FULFILLED:
      return state.merge({
        subs: new Map(payload.subs),
        bw: new Map(payload.bw),
        repo: new Map(payload.repo)
      })

    default:
      return state
  }
}

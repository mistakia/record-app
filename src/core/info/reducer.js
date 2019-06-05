import { Map, List } from 'immutable'
import { infoActions } from '@core/info'

export const initialState = new Map({
  ipfs: new Map({
    id: null,
    publicKey: null,
    agentVersion: null,
    protocolVersion: null,
    addresses: new List()
  }),
  state: null,
  orbitdb: new Map(),
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
          state: payload.state,
          ipfs: payload.ipfs,
          peers: payload.peers,
          orbitdb: payload.orbitdb,
          subs: payload.subs,
          bitswap: payload.bitswap,
          repo: payload.repo
        })
      })

    default:
      return state
  }
}

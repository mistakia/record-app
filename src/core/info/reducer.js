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
  peers: new List(),
  subs: new Map()
})

export function infoReducer(state = initialState, { payload, type }) {
  switch(type) {

  case infoActions.INFO_INIT_FULFILLED:
    return state.withMutations(state => {
      state.merge({
	ipfs: payload.ipfs,
	peers: payload.peers,
	subs: payload.subs
      })
    })

  default:
    return state
  }
}

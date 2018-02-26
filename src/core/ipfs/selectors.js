import { createSelector } from 'reselect'

export function getIPFSId(state) {
  const id = state.ipfs.toJS().id
  return id
}

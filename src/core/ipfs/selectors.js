import { createSelector } from 'reselect'

export function getId(state) {
  const id = state.ipfs.toJS().id
  return id
}

import { createSelector } from 'reselect'

export function getOrbitId(state) {
  const id = state.db.toJS().id
  return id
}

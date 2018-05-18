import { createSelector } from 'reselect'

export function getOrbitId(state) {
  const data = state.get('db')
  return data ? data.toJS().id : data
}

import { createSelector } from 'reselect'

import { CURRENT_TAGLIST_ADDRESS } from '@core/constants'
import { getApp } from '@core/app'

export function getTaglists (state) {
  return state.get('taglists')
}

export function getTaglistByAddress (state, address) {
  return getTaglists(state).get(address)
}

export function getCurrentTaglist (state) {
  const taglists = getTaglists(state)
  return taglists.get(CURRENT_TAGLIST_ADDRESS)
}

export function getUserTaglist (state) {
  const app = getApp(state)
  return getTaglistByAddress(state, app.address)
}

export const getTagsForUser = createSelector(
  getUserTaglist,
  taglist => taglist ? taglist.tags.map(t => t.tag) : []
)

export const getTagsForCurrentTaglist = createSelector(
  getCurrentTaglist,
  taglist => taglist.tags
)

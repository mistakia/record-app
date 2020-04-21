import { createSelector } from 'reselect'

import { getCurrentTracklistAddress } from '@core/tracklists'
import { getApp } from '@core/app'

export function getTaglists (state) {
  return state.get('taglists')
}

export function getTaglistByAddress (state, logAddress) {
  return getTaglists(state).get(logAddress)
}

export function getCurrentTaglist (state) {
  const logAddress = getCurrentTracklistAddress(state)
  const taglists = getTaglists(state)
  return taglists.get(logAddress)
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

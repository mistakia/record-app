import { createSelector } from 'reselect'

import { getCurrentTracklistId } from '@core/tracklists'
import { getApp } from '@core/app'

export function getTaglists (state) {
  return state.get('taglists')
}

export function getTaglistById (state, logId) {
  return getTaglists(state).get(logId)
}

export function getCurrentTaglist (state) {
  const logId = getCurrentTracklistId(state)
  const taglists = getTaglists(state)
  return taglists.get(logId)
}

export function getUserTaglist (state) {
  const app = getApp(state)
  return getTaglistById(state, app.address)
}

export const getTagsForUser = createSelector(
  getUserTaglist,
  taglist => taglist ? taglist.tags.map(t => t.tag) : []
)

export const getTagsForCurrentTaglist = createSelector(
  getCurrentTaglist,
  taglist => taglist.tags
)

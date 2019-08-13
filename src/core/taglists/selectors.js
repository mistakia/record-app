import { createSelector } from 'reselect'

import { getApp } from '@core/app'

export function getTaglists (state) {
  return state.get('taglists')
}

export function getTaglistById (state, logId) {
  return getTaglists(state).get(logId)
}

export function getCurrentTaglist (state) {
  const taglists = getTaglists(state)
  return taglists.get(taglists.get('currentTaglistId'))
}

export function getUserTaglist (state) {
  const app = getApp(state)
  return getTaglistById(state, app.address)
}

export function getCurrentSelectedTags (state) {
  return getTaglists(state).get('currentSelectedTags').toJS()
}

export const getTagsForUser = createSelector(
  getUserTaglist,
  taglist => taglist ? taglist.tags.map(t => t.tag) : []
)

export const getTagsForCurrentTaglist = createSelector(
  getCurrentTaglist,
  taglist => taglist.tags
)

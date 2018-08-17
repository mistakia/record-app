import { createSelector } from 'reselect'

export function getTaglists (state) {
  return state.get('taglists')
}

export function getTaglistById (state, logId) {
  return getTaglists(state).get(logId)
}

export function getCurrentTaglist (state) {
  let taglists = getTaglists(state)
  return taglists.get(taglists.get('currentTaglistId'))
}

export function getUserTaglist (state) {
  return getTaglistById(state, '/me')
}

export function getCurrentSelectedTags (state) {
  return getTaglists(state).get('currentSelectedTags').toJS()
}

export const getTagsForUser = createSelector(
  getUserTaglist,
  taglist => taglist.tags.map(t => t.tag)
)

export const getTagsForCurrentTaglist = createSelector(
  getCurrentTaglist,
  taglist => taglist.tags
)

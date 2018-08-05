import { createSelector } from 'reselect'

export function getTaglists (state) {
  return state.get('taglists')
}

export function getUserTaglist (state) {
  let taglists = getTaglists(state)
  return taglists.get('/me')
}

export const getTagsForUserTaglist = createSelector(
  getUserTaglist,
  taglist => taglist.tags
)

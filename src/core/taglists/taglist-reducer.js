import { List } from 'immutable'

import { taglistActions } from './actions'
import { Taglist } from './taglist'

export function taglistReducer (state = new Taglist(), { payload, type }) {
  switch (type) {
    case taglistActions.FETCH_TAGS_FULFILLED:
      return state.withMutations(taglist => {
        taglist.merge({
          isPending: false,
          tags: mergeTags(taglist.tags, payload.data)
        })
      })

    case taglistActions.FETCH_TAGS_PENDING:
      return state.set('isPending', true)

    case taglistActions.LOAD_TAGS:
      return state.isNew ? state.set('id', payload.logId) : state

    default:
      return state
  }
}

function mergeTags (taglist, collection) {
  let tags = taglist.toJS()
  let newTags = collection.reduce((list, tag) => {
    if (tags.indexOf(tag) === -1) list.push(tag)
    return list
  }, [])

  return newTags.length ? new List(tags.concat(newTags)) : taglist
}

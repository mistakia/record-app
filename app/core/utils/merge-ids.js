import { List } from 'immutable'

export const mergeIds = (listIds, collection) => {
  let ids = listIds.toJS()
  let newIds = collection.reduce((list, data) => {
    if (ids.indexOf(data.id) === -1) list.push(data.id)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : listIds
}

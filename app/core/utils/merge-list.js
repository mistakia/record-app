import { List } from 'immutable'

const getProp = (obj, path) => path.split('.').reduce((value, el) => value[el], obj)

export const mergeList = (listIds, collection, property = 'id') => {
  let ids = listIds.toJS()
  let newIds = collection.reduce((list, data) => {
    const value = getProp(data, property)
    if (ids.indexOf(value) === -1) list.push(value)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : listIds
}

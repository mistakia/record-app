import { Record } from 'immutable'

export const Track = new Record({
  id: null,
  title: null
})

export function createTrack(data) {
  return new Track({
    id: data._id,
    title: data.title
  })
}

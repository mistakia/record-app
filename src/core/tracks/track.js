import { Record } from 'immutable'

export const Track = new Record({
  id: null,
  title: null,
  url: null,
  stream_url: null
})

export function createTrack (data) {
  return new Track({
    id: data._id,
    title: data.content.title,
    url: data.content.url,
    stream_url: data.content.stream_url
  })
}

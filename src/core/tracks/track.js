import { Record } from 'immutable'

export const Track = new Record({
  duration: null,
  id: null,
  thumbnail: null,
  title: null,
  url: null,
  webpage_url: null
})

export function createTrack (data) {
  return new Track({
    duration: data.content.duration,
    id: data._id,
    thumbnail: data.content.thumbnail,
    title: data.content.fulltitle,
    url: data.content.url,
    webpage_url: data.content.webpage_url
  })
}

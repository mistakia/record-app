import { Record, List } from 'immutable'

export const Track = new Record({
  duration: null,
  id: null,
  thumbnail: null,
  title: null,
  url: null,
  tags: new List(),
  webpage_url: null
})

export function createTrack (data) {
  return new Track({
    duration: data.content.duration,
    id: data._id,
    thumbnail: data.content.thumbnail,
    title: data.content.fulltitle || data.content.title,
    url: data.content.url,
    tags: new List(data.content.tags),
    webpage_url: data.content.webpage_url
  })
}

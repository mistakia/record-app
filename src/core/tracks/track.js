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
  if (!data.content) {
    return
  }

  const { metadata } = data.content

  return new Track({
    duration: metadata.duration,
    id: data._id,
    thumbnail: metadata.thumbnail || '',
    title: metadata.fulltitle || data.content.title,
    url: metadata.url,
    tags: new List(data.content.tags),
    webpage_url: data.content.webpage_url
  })
}

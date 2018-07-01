import { Record } from 'immutable'

export const Track = new Record({
  id: null,
  title: null,
  url: null,
  webpage_url: null
})

export function createTrack (data) {
  return new Track({
    id: data._id,
    title: data.content.fulltitle,
    url: data.content.url,
    webpage_url: data.content.webpage_url
  })
}

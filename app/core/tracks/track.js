import { Record, List } from 'immutable'

import { BASE_URL } from '@core/constants'

export const Track = new Record({
  duration: null,
  id: null,
  thumbnail: null,
  title: null,
  name: null,
  artist: null,
  remixer: null,
  format: null,
  bitrate: null,
  url: null,
  tags: new List(),
  externalTags: new List(),
  isLocal: false,
  haveTrack: false,
  isUpdating: false,
  webpage_url: null,
  contentCID: null,
  listens: new List()
})

const getFromResolver = (resolver, attribute) => {
  if (!resolver.length) {
    return null
  }

  const item = resolver.find(r => r[attribute])
  return item && item[attribute]
}

const getArtwork = (content) => {
  if (!content.artwork.length) return getFromResolver(content.resolver, 'thumbnail')

  const artwork = content.artwork[0]
  return `${BASE_URL}/file/${artwork}`
}

const getTitle = (content) => {
  if (content.tags.title && content.tags.artist) {
    return `${content.tags.artist} - ${content.tags.title}`
  } else if (content.tags.title || content.tags.artist) {
    return content.tags.artist || content.tags.title
  }

  return getFromResolver(content.resolver, 'fulltitle')
}

const getUrl = (content) => {
  if (content.hash) {
    return `${BASE_URL}/file/${content.hash}`
  }

  return getFromResolver(content.resolver, 'url')
}

const getInfo = (content) => {
  let artist = content.tags.artist
  let name = content.tags.title
  let remixer = null

  if (!name) {
    name = getFromResolver(content.resolver, 'fulltitle')
  }

  return { artist, name, remixer }
}

export function createTrack (data) {
  if (!data.content) {
    return
  }

  const artwork = getArtwork(data.content)
  const title = getTitle(data.content)
  const { name, artist, remixer } = getInfo(data.content)
  const url = getUrl(data.content)

  return new Track({
    duration: data.content.audio.duration,
    id: data.id,
    thumbnail: artwork,
    format: data.content.audio.dataformat,
    bitrate: data.content.audio.bitrate,
    title,
    artist,
    name,
    remixer,
    url,
    isLocal: !!data.isLocal,
    contentCID: data.contentCID,
    listens: new List(data.listens),
    haveTrack: !!data.haveTrack,
    tags: new List(data.tags),
    externalTags: new List(data.externalTags)
  })
}

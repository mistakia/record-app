import { Record, List } from 'immutable'

export const Track = new Record({
  duration: null,
  id: null,
  thumbnail: null,
  title: null,
  name: null,
  artist: null,
  remixer: null,
  encoder: null,
  bitrate: null,
  url: null,
  tags: new List(),
  haveTrack: false,
  isUpdating: false,
  webpage_url: null,
  contentCID: null
})

const getFromResolver = (resolver, attribute) => {
  if (!resolver.length) {
    return null
  }

  const item = resolver.find(r => r[attribute])
  return item && item[attribute]
}

const getArtwork = (content) => {
  if (content.artwork.length) {
    return `http://localhost:3000/file/${content.artwork[0]}`
  }

  return getFromResolver(content.resolver, 'thumbnail')
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
    return `http://localhost:3000/file/${content.hash}`
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
  if (artwork && typeof artwork !== 'string') {
    console.log(artwork)
  }
  const title = getTitle(data.content)
  const { name, artist, remixer } = getInfo(data.content)
  const url = getUrl(data.content)

  return new Track({
    duration: data.content.audio.duration,
    id: data.id,
    thumbnail: artwork,
    encoder: data.content.audio.encoder,
    bitrate: data.content.audio.bitrate,
    title,
    artist,
    name,
    remixer,
    url,
    contentCID: data.contentCID,
    haveTrack: !!data.haveTrack,
    tags: new List(data.tags)
  })
}

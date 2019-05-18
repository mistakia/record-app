import { Record, List } from 'immutable'

export const Track = new Record({
  duration: null,
  id: null,
  thumbnail: null,
  title: null,
  url: null,
  tags: new List(),
  webpage_url: null,
  contentCID: null
})

const getArtwork = (content) => {
  if (content.artwork.length) {
    return `http://localhost:3000/file/${content.artwork[0]}`
  }

  if (content.resolver.length) {
    return content.resolver.find(r => r.thumbnail).thumbnail
  }

  return ''
}

const getTitle = (content) => {
  if (content.tags.title || content.tags.artist) {
    return `${content.tags.artist} - ${content.tags.title}`
  }

  if (content.resolver.length) {
    return content.resolver.find(r => r.fulltitle).fulltitle
  }

  return ''
}

const getUrl = (content) => {
  if (content.hash) {
    return `http://localhost:3000/file/${content.hash}`
  }

  if (content.resolver.length) {
    return content.resolver.find(r => r.url).url
  }
  return ''
}

export function createTrack (data) {
  if (!data.content) {
    return
  }

  const artwork = getArtwork(data.content)
  const title = getTitle(data.content)
  const url = getUrl(data.content)

  return new Track({
    duration: data.content.audio.duration,
    id: data._id,
    thumbnail: artwork,
    title: title,
    url: url,
    contentCID: data.contentCID,
    tags: new List(data.tags)
  })
}

/* global fetch, AbortController */

const qs = (params) => Object.keys(params).map(key => key + '=' + params[key]).join('&')

const POST = (data) => ({
  method: 'POST',
  body: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json'
  }
})

const DELETE = {
  method: 'DELETE'
}

export const api = {
  fetchContacts ({ logId }) {
    const url = `http://localhost:3000/contacts${logId}`
    return { url }
  },
  fetchFeed ({ logId, params }) {
    const url = `http://localhost:3000/feed?${qs(params)}`
    return { url }
  },
  fetchInfo () {
    const url = 'http://localhost:3000/info'
    return { url }
  },
  fetchTags ({ logId }) {
    const url = `http://localhost:3000/tags${logId}`
    return { url }
  },
  fetchTracks ({ logId }) {
    const url = `http://localhost:3000/tracks${logId}`
    return { url }
  },
  postTag ({ logId, data }) {
    const url = 'http://localhost:3000/tags'
    const post = POST(data)
    return { url, ...post }
  },
  deleteTag ({ logId, data }) {
    const url = `http://localhost:3000/tags?${qs(data)}`
    return { url, ...DELETE }
  },
  postContact ({ logId, data }) {
    const url = 'http://localhost:3000/contacts'
    const post = POST(data)
    return { url, ...post }
  },
  postTrack ({ logId, data }) {
    const url = 'http://localhost:3000/tracks'
    const post = POST(data)
    return { url, ...post }
  }
}

export const apiRequest = (apiFunction, opts) => {
  const abort = new AbortController()
  const signal = abort.signal
  const options = Object.assign(apiFunction(opts), signal)
  const request = dispatchFetch.bind(null, options)
  return { abort, request }
}

export const dispatchFetch = (options) => {
  return fetch(options.url, options).then(response => response.json())
}

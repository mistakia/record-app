/* global fetch, AbortController */

import queryString from 'query-string'

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
  fetchInfo () {
    const url = 'http://localhost:3000/info'
    return { url }
  },
  fetchPeers () {
    const url = 'http://localhost:3000/peers'
    return { url }
  },
  fetchPrivateKey () {
    const url = 'http://localhost:3000/export'
    return { url }
  },
  fetchContact ({ logId }) {
    const url = `http://localhost:3000/contact${logId}`
    return { url }
  },
  fetchAllContacts () {
    const url = 'http://localhost:3000/contacts/all'
    return { url }
  },
  fetchTags ({ logId }) {
    const url = `http://localhost:3000/tags${logId}`
    return { url }
  },
  fetchPlayerTracks ({ logId, params }) {
    const url = `http://localhost:3000/tracks${logId}?${queryString.stringify(params)}`
    return { url }
  },
  fetchShuffleTracks ({ logId, params }) {
    const url = `http://localhost:3000/tracks${logId}?${queryString.stringify(params)}`
    return { url }
  },
  fetchTracks ({ logId, params }) {
    const url = `http://localhost:3000/tracks${logId}?${queryString.stringify(params)}`
    return { url }
  },
  postTag ({ logId, data }) {
    const url = 'http://localhost:3000/tags'
    const post = POST(data)
    return { url, ...post }
  },
  deleteTag ({ logId, data }) {
    const url = `http://localhost:3000/tags?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postContact ({ logId, data }) {
    const url = 'http://localhost:3000/contacts'
    const post = POST(data)
    return { url, ...post }
  },
  deleteContact ({ logId, data }) {
    const url = `http://localhost:3000/contacts?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postAbout ({ data }) {
    const url = 'http://localhost:3000/about'
    const post = POST(data)
    return { url, ...post }
  },
  postTrack ({ data }) {
    const url = 'http://localhost:3000/tracks'
    const post = POST(data)
    return { url, ...post }
  },
  deleteTrack ({ data }) {
    const url = `http://localhost:3000/tracks?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postIdentity ({ privateKey }) {
    const url = 'http://localhost:3000/import'
    const post = POST({ privateKey })
    return { url, ...post }
  },
  connectContact ({ logId, contactId }) {
    const params = { contactId }
    const url = `http://localhost:3000/connect${logId}?${queryString.stringify(params)}`
    return { url }
  },
  disconnectContact ({ logId, contactId }) {
    const params = { contactId }
    const url = `http://localhost:3000/disconnect${logId}?${queryString.stringify(params)}`
    return { url }
  },
  deleteLog ({ logId }) {
    const url = `http://localhost:3000/contact${logId}`
    return { url, ...DELETE }
  }
}

export const apiRequest = (apiFunction, opts) => {
  const controller = new AbortController()
  const abort = controller.abort.bind(controller)
  const options = Object.assign(apiFunction(opts), controller.signal)
  const request = dispatchFetch.bind(null, options)
  return { abort, request }
}

export const dispatchFetch = (options) => {
  return fetch(options.url, options).then(response => response.json())
}

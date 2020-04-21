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
  fetchLogs ({ logAddress }) {
    const url = `http://localhost:3000/logs${logAddress}`
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
  fetchLog ({ logAddress }) {
    const url = `http://localhost:3000/log${logAddress}`
    return { url }
  },
  fetchAllLogs () {
    const url = 'http://localhost:3000/logs/all'
    return { url }
  },
  fetchTags ({ logAddress }) {
    const url = `http://localhost:3000/tags${logAddress}`
    return { url }
  },
  fetchPlayerTracks ({ logAddress, params }) {
    const url = `http://localhost:3000/tracks${logAddress}?${queryString.stringify(params)}`
    return { url }
  },
  fetchShuffleTracks ({ logAddress, params }) {
    const url = `http://localhost:3000/tracks${logAddress}?${queryString.stringify(params)}`
    return { url }
  },
  fetchTracks ({ logAddress, params }) {
    const url = `http://localhost:3000/tracks${logAddress}?${queryString.stringify(params)}`
    return { url }
  },
  postTag ({ logAddress, data }) {
    const url = 'http://localhost:3000/tags'
    const post = POST(data)
    return { url, ...post }
  },
  deleteTag ({ logAddress, data }) {
    const url = `http://localhost:3000/tags?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postLogLink ({ logAddress, data }) {
    const url = 'http://localhost:3000/logs'
    const post = POST(data)
    return { url, ...post }
  },
  deleteLogLink ({ logAddress, data }) {
    const url = `http://localhost:3000/logs?${queryString.stringify(data)}`
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
  connectLog ({ logAddress }) {
    const url = `http://localhost:3000/connect${logAddress}`
    return { url }
  },
  disconnectLog ({ logAddress }) {
    const url = `http://localhost:3000/disconnect${logAddress}`
    return { url }
  },
  deleteLog ({ logAddress }) {
    const url = `http://localhost:3000/log${logAddress}`
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

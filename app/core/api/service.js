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

const port = process.env.NODE_ENV === 'development' ? 3001 : 3000
const baseUrl = `http://localhost:${port}`

export const api = {
  fetchListens ({ logAddress, params }) {
    const url = `${baseUrl}/listens?${queryString.stringify(params)}`
    return { url }
  },
  postListen ({ logAddress, data }) {
    const url = `${baseUrl}/listens`
    const post = POST(data)
    return { url, ...post }
  },
  fetchLogs ({ logAddress }) {
    const url = `${baseUrl}/logs${logAddress}`
    return { url }
  },
  fetchInfo () {
    const url = `${baseUrl}/info`
    return { url }
  },
  fetchPeers () {
    const url = `${baseUrl}/peers`
    return { url }
  },
  fetchPrivateKey () {
    const url = `${baseUrl}/export`
    return { url }
  },
  fetchLog ({ logAddress }) {
    const url = `${baseUrl}/log${logAddress}`
    return { url }
  },
  fetchAllLogs () {
    const url = `${baseUrl}/logs/all`
    return { url }
  },
  fetchTags ({ logAddress }) {
    const url = `${baseUrl}/tags${logAddress}`
    return { url }
  },
  fetchTracks ({ logAddress, params }) {
    const url = `${baseUrl}/tracks${logAddress}?${queryString.stringify(params)}`
    return { url }
  },
  postTag ({ logAddress, data }) {
    const url = `${baseUrl}/tags`
    const post = POST(data)
    return { url, ...post }
  },
  deleteTag ({ logAddress, data }) {
    const url = `${baseUrl}/tags?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postLogLink ({ logAddress, data }) {
    const url = `${baseUrl}/logs`
    const post = POST(data)
    return { url, ...post }
  },
  deleteLogLink ({ logAddress, data }) {
    const url = `${baseUrl}/logs?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postAbout ({ data }) {
    const url = `${baseUrl}/about`
    const post = POST(data)
    return { url, ...post }
  },
  postTrack ({ data }) {
    const url = `${baseUrl}/tracks`
    const post = POST(data)
    return { url, ...post }
  },
  deleteTrack ({ data }) {
    const url = `${baseUrl}/tracks?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postIdentity ({ privateKey }) {
    const url = `${baseUrl}/import`
    const post = POST({ privateKey })
    return { url, ...post }
  },
  connectLog ({ logAddress }) {
    const url = `${baseUrl}/connect${logAddress}`
    return { url }
  },
  disconnectLog ({ logAddress }) {
    const url = `${baseUrl}/disconnect${logAddress}`
    return { url }
  },
  deleteLog ({ logAddress }) {
    const url = `${baseUrl}/log${logAddress}`
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

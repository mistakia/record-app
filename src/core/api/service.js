/* global fetch, AbortController */

import queryString from 'query-string'

import { BASE_URL } from '@core/constants'

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
  fetchListens ({ params }) {
    const url = `${BASE_URL}/listens?${queryString.stringify(params)}`
    return { url }
  },
  postListen ({ address, data }) {
    const url = `${BASE_URL}/listens`
    const post = POST(data)
    return { url, ...post }
  },
  fetchLogs ({ address }) {
    const url = `${BASE_URL}/logs${address}`
    return { url }
  },
  fetchInfo () {
    const url = `${BASE_URL}/settings`
    return { url }
  },
  fetchPeers () {
    const url = `${BASE_URL}/peers`
    return { url }
  },
  fetchPrivateKey () {
    const url = `${BASE_URL}/export`
    return { url }
  },
  fetchLog ({ address }) {
    const url = `${BASE_URL}/log${address}`
    return { url }
  },
  fetchAllLogs () {
    const url = `${BASE_URL}/logs/all`
    return { url }
  },
  fetchTags ({ params }) {
    const url = `${BASE_URL}/tags?${queryString.stringify(params)}`
    return { url }
  },
  fetchTracks ({ params }) {
    const url = `${BASE_URL}/tracks?${queryString.stringify(params)}`
    return { url }
  },
  postTag ({ address, data }) {
    const url = `${BASE_URL}/tags`
    const post = POST(data)
    return { url, ...post }
  },
  deleteTag ({ address, data }) {
    const url = `${BASE_URL}/tags?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postLogLink ({ address, data }) {
    const url = `${BASE_URL}/logs`
    const post = POST(data)
    return { url, ...post }
  },
  deleteLogLink ({ address, data }) {
    const url = `${BASE_URL}/logs?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postAbout ({ data }) {
    const url = `${BASE_URL}/about`
    const post = POST(data)
    return { url, ...post }
  },
  postTrack ({ data }) {
    const url = `${BASE_URL}/tracks`
    const post = POST(data)
    return { url, ...post }
  },
  postImporter ({ data }) {
    const url = `${BASE_URL}/importer`
    const post = POST(data)
    return { url, ...post }
  },
  deleteTrack ({ data }) {
    const url = `${BASE_URL}/tracks?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postIdentity ({ privateKey }) {
    const url = `${BASE_URL}/import`
    const post = POST({ privateKey })
    return { url, ...post }
  },
  connectLog ({ address }) {
    const url = `${BASE_URL}/connect${address}`
    return { url }
  },
  disconnectLog ({ address }) {
    const url = `${BASE_URL}/disconnect${address}`
    return { url }
  },
  deleteLog ({ address }) {
    const url = `${BASE_URL}/log${address}`
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
  return fetch(options.url, options).then(response => {
    const res = response.json()
    if (response.status >= 200 && response.status < 300) {
      return res
    } else {
      const error = new Error(res.error || response.statusText)
      error.response = response
      throw error
    }
  })
}

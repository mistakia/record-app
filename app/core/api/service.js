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
  fetchListens ({ logAddress, params }) {
    const url = `${BASE_URL}/listens?${queryString.stringify(params)}`
    return { url }
  },
  postListen ({ logAddress, data }) {
    const url = `${BASE_URL}/listens`
    const post = POST(data)
    return { url, ...post }
  },
  fetchLogs ({ logAddress }) {
    const url = `${BASE_URL}/logs${logAddress}`
    return { url }
  },
  fetchInfo () {
    const url = `${BASE_URL}/info`
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
  fetchLog ({ logAddress }) {
    const url = `${BASE_URL}/log${logAddress}`
    return { url }
  },
  fetchAllLogs () {
    const url = `${BASE_URL}/logs/all`
    return { url }
  },
  fetchTags ({ logAddress }) {
    const url = `${BASE_URL}/tags${logAddress}`
    return { url }
  },
  fetchTracks ({ logAddress, params }) {
    const url = `${BASE_URL}/tracks${logAddress}?${queryString.stringify(params)}`
    return { url }
  },
  postTag ({ logAddress, data }) {
    const url = `${BASE_URL}/tags`
    const post = POST(data)
    return { url, ...post }
  },
  deleteTag ({ logAddress, data }) {
    const url = `${BASE_URL}/tags?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postLogLink ({ logAddress, data }) {
    const url = `${BASE_URL}/logs`
    const post = POST(data)
    return { url, ...post }
  },
  deleteLogLink ({ logAddress, data }) {
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
  deleteTrack ({ data }) {
    const url = `${BASE_URL}/tracks?${queryString.stringify(data)}`
    return { url, ...DELETE }
  },
  postIdentity ({ privateKey }) {
    const url = `${BASE_URL}/import`
    const post = POST({ privateKey })
    return { url, ...post }
  },
  connectLog ({ logAddress }) {
    const url = `${BASE_URL}/connect${logAddress}`
    return { url }
  },
  disconnectLog ({ logAddress }) {
    const url = `${BASE_URL}/disconnect${logAddress}`
    return { url }
  },
  deleteLog ({ logAddress }) {
    const url = `${BASE_URL}/log${logAddress}`
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

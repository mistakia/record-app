/* global fetch */

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
  fetchContacts (logId) {
    const url = `http://localhost:3000/contacts${logId}`
    return dispatch({url})
  },
  fetchFeed (logId, params) {
    const url = `http://localhost:3000/feed?${qs(params)}`
    return dispatch({url})
  },
  fetchInfo () {
    const url = 'http://localhost:3000/info'
    return dispatch({url})
  },
  fetchTags (logId) {
    const url = `http://localhost:3000/tags${logId}`
    return dispatch({url})
  },
  fetchTracks (logId) {
    const url = `http://localhost:3000/tracks${logId}`
    return dispatch({url})
  },
  postTag (logId, data) {
    const url = 'http://localhost:3000/tags'
    const post = POST(data)
    return dispatch({ url, ...post })
  },
  deleteTag (logId, data) {
    const url = `http://localhost:3000/tags?${qs(data)}`
    return dispatch({ url, ...DELETE })
  },
  postContact (logId, data) {
    const url = 'http://localhost:3000/contacts'
    const post = POST(data)
    return dispatch({ url, ...post })
  },
  postTrack (logId, data) {
    const url = 'http://localhost:3000/tracks'
    const post = POST(data)
    return dispatch({ url, ...post })
  }
}

export function dispatch (options) {
  return fetch(options.url, options).then(response => response.json())
}

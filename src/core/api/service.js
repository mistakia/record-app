/* global fetch */

export const api = {
  fetchContacts (logId) {
    const url = `http://localhost:3000/contacts/${logId}`
    return dispatch({url})
  },
  fetchInfo () {
    const url = 'http://localhost:3000/info'
    return dispatch({url})
  },
  fetchTracks (logId) {
    const url = `http://localhost:3000/tracks${logId}`
    return dispatch({url})
  },
  postContact (logId, data) {
    const url = 'http://localhost:3000/contacts'
    return dispatch({
      url,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },
  postTrack (logId, data) {
    const url = 'http://localhost:3000/tracks'
    return dispatch({
      url,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export function dispatch (options) {
  return fetch(options.url, options).then(response => response.json())
}

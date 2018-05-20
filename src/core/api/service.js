export const api = {
  fetch(path) {
    const url = `http://localhost:3000/${path}`
    return dispatch({url})
  },
  fetchContacts(logId) {
    const url = `http://localhost:3000/logs/contacts/${logId}`
    return dispatch({url})
  },
  fetchInfo() {
    const url = 'http://localhost:3000/info'
    return dispatch({url})
  },
  fetchTracks(logId) {
    const url =`http://localhost:3000/logs/tracks/${logId}`
    return dispatch({url})
  }
}

export function dispatch(options) {
  return fetch(options.url).then(response => response.json())
}

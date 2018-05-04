export const api = {
  fetch(path) {
    const url = `http://localhost:3000/${path}`
    return dispatch({url})
  },
  fetchInit() {
    const url = 'http://localhost:3000/'
    return dispatch({url})
  },
  fetchTracks(tracklistId) {
    const url =`http://localhost:3000/tracks/${tracklistId}`
    return dispatch({url})
  }
}

export function dispatch(options) {
  return fetch(options.url).then(response => response.json())
}

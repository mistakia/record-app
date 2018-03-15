export const api = {
  fetch(path) {
    const url = `http://localhost:3000/${path}`
    return dispatch({url})
  },
  fetchInit() {
    const url = 'http://localhost:3000/'
    return dispatch({url})
  },
  fetchAddress(address) {
    const url = `http://localhost:3000/orbitdb/${address}`
    return dispatch({url})
  }
}

export function dispatch(options) {
  return fetch(options.url).then(response => response.json())
}

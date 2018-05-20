export function getInfo (state) {
  const info = state.get('info')
  return info ? info.toJS() : info
}

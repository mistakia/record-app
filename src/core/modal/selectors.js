export function getModal (state) {
  return state.get('modal')
}

export function getModalType (state) {
  return getModal(state).toJS()
}

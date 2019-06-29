import { Record } from 'immutable'
import { aboutActions } from './actions'

const initialState = new Record({
  isUpdating: false
})

export function aboutReducer (state = initialState(), { payload, type }) {
  switch (type) {
    case aboutActions.POST_ABOUT_PENDING:
      return state.set('isUpdating', true)

    case aboutActions.POST_ABOUT_FAILED:
    case aboutActions.POST_ABOUT_FULFILLED:
      return state.set('isUpdating', false)

    default:
      return state
  }
}

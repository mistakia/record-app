import { Map } from 'immutable'

import { profileActions } from './actions'
import { profileReducer } from './profile-reducer'

export const initialState = new Map({
  currentProfileId: null
})

export function profilesReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case profileActions.FETCH_PROFILE_PENDING:
    case profileActions.FETCH_PROFILE_FULFILLED:
      return state.set(
        payload.logId,
        profileReducer(state.get(payload.logId), action)
      )

    case profileActions.LOAD_PROFILE:
      return state.merge({
        currentProfileId: payload.logId,
        [payload.logId]: profileReducer(undefined, action)
      })

    default:
      return state
  }
}

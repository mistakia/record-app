import { profileActions } from './actions'
import { Profile } from './profile'

export function profileReducer (state = new Profile(), { payload, type }) {
  switch (type) {
    case profileActions.FETCH_PROFILE_FULFILLED:
      return state.withMutations(profile => {
        profile.merge({
          isPending: false,
          contactId: payload.data._id
        })
      })

    case profileActions.FETCH_PROFILE_PENDING:
      return state.set('isPending', true)

    case profileActions.LOAD_PROFILE:
      return state.set('id', payload.logId)

    default:
      return state
  }
}

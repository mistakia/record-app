import { Map, List } from 'immutable'

import { importerActions } from './actions'

export const initialState = new Map({
  files: new List(),
  errors: new List(),
  remaining: 0,
  completed: 0,
  previouslyCompleted: 0
})

export function importerReducer (state = initialState, { payload, type }) {
  switch (type) {
    case importerActions.IMPORTER_STARTING:
      return state.merge({
        completed: payload.completed,
        previouslyCompleted: payload.completed,
        remaining: payload.remaining
      })

    case importerActions.IMPORTER_PROCESSED_FILE:
      return state.merge({
        files: new List(payload.files),
        errors: new List(payload.errors),
        completed: payload.completed,
        remaining: payload.remaining
      })

    default:
      return state
  }
}

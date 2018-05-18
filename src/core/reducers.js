import { combineReducers } from 'redux-immutable'

import { contactsReducer } from './contacts'
import { contactlistsReducer } from './contactlists'
import { dbReducer } from './db'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'


const rootReducer = asyncReducers => {
  return combineReducers({
    contacts: contactsReducer,
    contactlists: contactlistsReducer,
    db: dbReducer,
    tracklists: tracklistsReducer,
    tracks: tracksReducer,
    ...asyncReducers
  })
}

export default rootReducer

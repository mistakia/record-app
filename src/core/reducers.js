import { combineReducers } from 'redux-immutable'

import { contactsReducer } from './contacts'
import { contactlistsReducer } from './contactlists'
import { infoReducer } from './info'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'


const rootReducer = asyncReducers => {
  return combineReducers({
    contacts: contactsReducer,
    contactlists: contactlistsReducer,
    info: infoReducer,
    tracklists: tracklistsReducer,
    tracks: tracksReducer,
    ...asyncReducers
  })
}

export default rootReducer

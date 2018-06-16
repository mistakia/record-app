import { combineReducers } from 'redux-immutable'

import { contactsReducer } from './contacts'
import { contactlistsReducer } from './contactlists'
import { infoReducer } from './info'
import { playerReducer, playerTimesReducer } from './player'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'

const rootReducer = asyncReducers => {
  return combineReducers({
    contacts: contactsReducer,
    contactlists: contactlistsReducer,
    info: infoReducer,
    player: playerReducer,
    playerTimes: playerTimesReducer,
    tracklists: tracklistsReducer,
    tracks: tracksReducer,
    ...asyncReducers
  })
}

export default rootReducer

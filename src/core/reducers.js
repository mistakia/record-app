import { combineReducers } from 'redux-immutable'

import { contactsReducer } from './contacts'
import { contactlistsReducer } from './contactlists'
import { infoReducer } from './info'
import { modalReducer } from './modal'
import { playerReducer, playerTimesReducer } from './player'
import { taglistsReducer } from './taglists'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'

const rootReducer = asyncReducers => {
  return combineReducers({
    contacts: contactsReducer,
    contactlists: contactlistsReducer,
    info: infoReducer,
    modal: modalReducer,
    player: playerReducer,
    playerTimes: playerTimesReducer,
    taglists: taglistsReducer,
    tracklists: tracklistsReducer,
    tracks: tracksReducer,
    ...asyncReducers
  })
}

export default rootReducer

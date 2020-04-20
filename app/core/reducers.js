import { combineReducers } from 'redux-immutable'

import { aboutReducer } from './about'
import { appReducer } from './app'
import { contactsReducer } from './contacts'
import { contactlistsReducer } from './contactlists'
import { contextMenuReducer } from './context-menu'
import { infoReducer } from './info'
import { helpReducer } from './help'
import { playerReducer, playerTimesReducer } from './player'
import { taglistsReducer } from './taglists'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'

const rootReducer = asyncReducers => {
  return combineReducers({
    about: aboutReducer,
    app: appReducer,
    contacts: contactsReducer,
    contactlists: contactlistsReducer,
    contextMenu: contextMenuReducer,
    info: infoReducer,
    help: helpReducer,
    player: playerReducer,
    playerTimes: playerTimesReducer,
    taglists: taglistsReducer,
    tracklists: tracklistsReducer,
    tracks: tracksReducer,
    ...asyncReducers
  })
}

export default rootReducer

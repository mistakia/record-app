import { combineReducers } from 'redux-immutable'

import { aboutReducer } from './about'
import { appReducer } from './app'
import { logsReducer } from './logs'
import { loglistsReducer } from './loglists'
import { contextMenuReducer } from './context-menu'
import { importerReducer } from './importer'
import { infoReducer } from './info'
import { helpReducer } from './help'
import { notificationsReducer } from './notifications'
import { playerReducer, playerTimesReducer } from './player'
import { taglistsReducer } from './taglists'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'

const rootReducer = asyncReducers => {
  return combineReducers({
    about: aboutReducer,
    app: appReducer,
    logs: logsReducer,
    loglists: loglistsReducer,
    contextMenu: contextMenuReducer,
    importer: importerReducer,
    info: infoReducer,
    help: helpReducer,
    notifications: notificationsReducer,
    player: playerReducer,
    playerTimes: playerTimesReducer,
    taglists: taglistsReducer,
    tracklists: tracklistsReducer,
    tracks: tracksReducer,
    ...asyncReducers
  })
}

export default rootReducer

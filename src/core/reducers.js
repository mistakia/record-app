import { combineReducers } from 'redux'

import { dbReducer } from './db'
import { tracklistsReducer } from './tracklists'
import { tracksReducer } from './tracks'


export default combineReducers({
  db: dbReducer,
  tracklists: tracklistsReducer,
  tracks: tracksReducer
})

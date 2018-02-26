import { combineReducers } from 'redux'

import { dbReducer } from './db'
import { identitiesReducer } from './identities'
import { ipfsReducer } from './ipfs'
import { tracklistReducer } from './tracklist'
import { tracksReducer } from './tracks'


export default combineReducers({
  db: dbReducer,
  identities: identitiesReducer,
  ipfs: ipfsReducer,
  tracklist: tracklistReducer,
  tracks: tracksReducer
})

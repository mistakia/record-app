import { combineReducers } from 'redux'
import { identitiesReducer } from './identities'
import { tracklistReducer } from './tracklist'
import { tracksReducer } from './tracks'
import { ipfsReducer } from './ipfs'

export default combineReducers({
  identities: identitiesReducer,
  tracklist: tracklistReducer,
  tracks: tracksReducer,
  ipfs: ipfsReducer
})

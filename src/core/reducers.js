import { combineReducers } from 'redux'

import { dbReducer } from './db'


export default combineReducers({
  db: dbReducer
})

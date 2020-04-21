import { call, fork, take, put, select } from 'redux-saga/effects'

import { helpActions } from './actions'
import { DEFAULT_HELP_SETTINGS } from '@core/constants'
import { appActions } from '@core/app'
import { helpStorage } from './storage'
import { getHelp } from './selectors'

export function * saveHelpToStorage () {
  const help = yield select(getHelp)
  yield call(helpStorage.setPrefs, help)
}

export function * setHelpFromStorage () {
  let help = yield call(helpStorage.getPrefs)
  help = Object.assign(DEFAULT_HELP_SETTINGS, help)
  if (help) yield put(helpActions.setHelp(help))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchInitApp () {
  while (true) {
    yield take(appActions.INIT_APP)
    yield fork(setHelpFromStorage)
  }
}

export function * watchToggleHomeHelp () {
  while (true) {
    yield take(helpActions.TOGGLE_HOME_HELP)
    let help = yield select(getHelp)
    // persist only when set to not visible
    if (!help.isHomeHelpVisible) yield fork(saveHelpToStorage)
  }
}

//= ====================================
//  ROOT
// -------------------------------------

export const helpSagas = [
  fork(watchInitApp),
  fork(watchToggleHomeHelp)
]

import { HELP_STORAGE_KEY } from '@core/constants'
import { localStorageAdapter } from '@core/utils'

export const helpStorage = {
  clear () {
    localStorageAdapter.removeItem(HELP_STORAGE_KEY)
  },

  getPrefs () {
    return localStorageAdapter.getItem(HELP_STORAGE_KEY) || {}
  },

  setPrefs (prefs) {
    localStorageAdapter.setItem(HELP_STORAGE_KEY, prefs)
  }
}

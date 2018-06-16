import { AsyncStorage } from 'react-native'

export const localStorageAdapter = {
  async getItem (key) {
    const d = await JSON.parse(AsyncStorage.getItem(key))
    return d
  },

  removeItem (key) {
    AsyncStorage.removeItem(key)
  },

  setItem (key, value) {
    AsyncStorage.setItem(key, JSON.stringify(value))
  }
}

import { AsyncStorage } from 'react-native'

export const localStorageAdapter = {
  async getItem (key) {
    const item = await AsyncStorage.getItem(key)
    const d = await JSON.parse(item)
    return d
  },

  removeItem (key) {
    AsyncStorage.removeItem(key)
  },

  setItem (key, value) {
    AsyncStorage.setItem(key, JSON.stringify(value))
  }
}

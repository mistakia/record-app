import { Record } from 'immutable'

export const Identity = new Record({
  id: null
})

export function createIdentity(data) {
  let attrs = {
    id: data.id
  }

  return new Identity(attrs)
}

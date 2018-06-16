import { createSelectorCreator, defaultMemoize } from 'reselect'

export const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual
)

// copied from redux
// https://github.com/reactjs/react-redux/blob/65a80f89dbad5e1d3d4ff8ec11472ce0c966aad5/src/utils/shallowEqual.js

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  const hasOwn = Object.prototype.hasOwnProperty

  for (let i = 0; i < keysA.length; i++) {
    if (!hasOwn.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false
    }
  }

  return true
}

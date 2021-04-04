/* eslint no-labels: ["error", { "allowLoop": true }] */

// https://github.com/bevacqua/fuzzysearch
const fuzzySearch = (needle, haystack) => {
  const hlen = haystack.length
  const nlen = needle.length
  if (nlen > hlen) {
    return false
  }

  if (nlen === hlen) {
    return needle === haystack
  }
  outer: for (let i = 0, j = 0; i < nlen; i++) {
    const nch = needle.charCodeAt(i)
    while (j < hlen) {
      if (haystack.charCodeAt(j++) === nch) {
        continue outer
      }
    }
    return false
  }
  return true
}

export const fuzzyFilter = (array = [], search) => {
  return array.filter((item) => fuzzySearch(search, item))
}

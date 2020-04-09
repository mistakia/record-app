export const toQueryString = (params) => Object.keys(params).map((key) => {
  if (params[key] === undefined) {
    return ''
  }

  if (Array.isArray(params[key])) {
    const result = []
    for (const value of params[key].slice()) {
      if (value === undefined) {
        continue
      }
      result.push(key + '=' + value)
    }
    return result.join('&')
  }

  return key + '=' + params[key]
}).join('&')

module.exports = function logs(self) {

  function filterEntries(mapper) {
    return (doc) => {
      if (doc.type !== 'log')
	return false

      return mapper ? mapper(doc) : true
    }
  }  

  return {
    all: (mapper) => {
      const all = self._log.query(filterEntries(mapper))
      return all
    },
    
    add: async (data) => {
      data.type = 'log'
      const hash = await self._log.put(data)
      return hash
    },

    get: (key) => {
      const data = self._log.get(key).map((e) => e.payload.value)
      return data
    },

    del: async (key) => {
      const hash = await self._log.del(key)
      return hash
    }
  }
}

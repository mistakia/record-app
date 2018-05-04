module.exports = function tracks(self) {

  function filterEntries(mapper) {
    return (doc) => {
      if (doc.type !== 'track')
	return false

      return mapper ? mapper(doc) : true
    }
  }
  
  return {
    crate: () => {
      return this.all((doc) => doc.crate = true)
    },

    addToCrate: (data) => {
      data.type === 'track'
      data.crate = true
      return self._log.put(data)
    },

    removeFromCrate: (data) => {
      data.crate = false
      return self._log.put(data)
    },

    addTag: (data, tag) => {
      data.tags = data.tags || []
      data.tags.push(tag)
      return self._log.put(data)
    },

    removeTag: (data, tag) => {
      const index = data.tags.indexOf(tag)
      data.tags.splice(index, 1)
      return self._log.put(data)
    },

    all: (mapper) => {
      const all = self._log.query(filterEntries(mapper))
      return all
    },

    add: async (data) => {
      data.type = 'track'
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

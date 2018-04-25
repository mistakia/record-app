class Tracks {
  constructor(orbitdb, address, opts) {
    this._orbitdb = orbitdb
    this._address = address
    this._opts = opts
  }

  async init() {
    const db = await this._orbitdb.docs(this._address)
    await db.load()    
    this._db = db
  }

  crate(opts) {
    return this.all((doc) => doc.crate = true)
  }  

  addToCrate(data) {
    data.crate = true
    return this._db.put(data)
  }

  removeFromCrate(data) {
    data.crate = false
    return this._db.put(data)
  }

  addTag(data, tag) {
    data.tags = data.tags || []
    data.tags.push(tag)
    return this._db.put(data)
  }

  removeTag(data, tag) {
    const index = data.tags.indexOf(tag)
    data.tags.splice(index, 1)
    return this._db.put(data)
  }

  // search for tags

  all(mapper) {
    const all = db.query(mapper)
    return all
  }

  get(key) {
    const data = db.get(key).map((e) => e.payload.value)
    return data
  }

  async del(key) {
    const hash = await db.del(key)
    return hash
  }
}

module.exports = Tracks

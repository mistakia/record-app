const tracks = require('./tracks')
const logs = require('./logs')

class RecordLog {
  constructor(orbitdb, address) {
    this._orbitdb = orbitdb 
    this._address = `/record/${address || orbitdb.id}`

    this.tracks = tracks(this)
    this.logs = logs(this)
  }

  async load() {
    this._log  = await this._orbitdb.docs(this._address)
    await this._log.load()    
  }  
}

module.exports = RecordLog

const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const express = require('express')
const EventEmitter = require('events')

const ipfsConfig = require('../../config/ipfs.config')

class RecordNode extends EventEmitter {
  constructor(options) {
    super()

    this._ipfs = null
    this._orbitdb = null    
  }


  start() {
    const self = this
    this._ipfs = new IPFS(ipfsConfig)

    this._ipfs.on('error', (e) => this.emit('error', e))
    this._ipfs.on('ready', async () => {
      const ipfsInfo = await self._ipfs.id()
      self._orbitdb = new OrbitDB(self._ipfs)

      console.log(`IPFS ID: ${ipfsInfo.id}`)
      console.log(`Orbit ID: ${self._orbitdb.id}`)

      self.emit('ready')
    })

    const app = express()

    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })

    app.get('/', (req, res) => res.send({ id: self._orbitdb.id }))

    app.listen(3000, () => console.log('Example app listening on port 3000!'))
  }

}

module.exports = RecordNode

const express = require('express')

const orbitdbRouter = require('./routes/orbitdb')
const ipfsRouter = require('./routes/ipfs')
const tracksRouter = require('./routes/tracks')

module.exports = (self) => {
  const app = express()

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    next()
  })

  app.use((req, res, next) => {
    req.orbitdb = self._orbitdb
    req.ipfs = self._ipfs
    req.log = self._log
    next()
  })

  app.use('/orbitdb', orbitdbRouter)
  app.use('/ipfs', ipfsRouter)
  app.use('/tracks', tracksRouter)

  app.get('/', async (req, res) => {
    const ipfsInfo = await req.ipfs.id()

    res.send({
      id: req.orbitdb.id,
      addresses: ipfsInfo.addresses
    })
  })

  return app
}

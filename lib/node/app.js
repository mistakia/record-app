const express = require('express')

const orbitdbRouter = require('./routes/ordbitdb')
const ipfsRouter = require('./routes/ipfs')

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
  })

  app.get('/', async (req, res) => {
    const ipfsInfo = await req.ipfs.id()

    res.send({
      id: req.orbitdb.id,
      addresses: ipfsInfo.addresses
    })
  })

  app.use('/orbitdb', orbitdbRouter)
  app.use('/ipfs', ipfsRouter)

  return app
}

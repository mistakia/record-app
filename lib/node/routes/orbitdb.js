const express = require('express')
const router = express.Router()

router.get('*', async (req, res) => {
  const address = req.params[0]
  const db = await req.orbitdb.log(address, { sync: true })

  const limit = req.query.limit || -1

  console.log(`DB Address: ${db.address}`)

  db.events.on('load.progress', (address, hash, entry, progress, total) => {
    console.log('db - load.progress', progress, total)
  })

  db.events.on('replicate', (address) => console.log('db - replicate', address ))
  db.events.on('replicate.progress', (address, hash, entry, progress, total) => console.log(`replicate progress for ${address} - ${progress} of ${total}`))

  db.events.on('ready', () => {
    console.log('db ready')
  })

  db.events.on('replicated', (address, length) => {
    console.log(`Replicated: ${address} - ${length}`)

    //TODO: figure out when the entire remote database has replicated
    /* const result = db.iterator({ limit: limit }).collect()
     * res.send({
     *   result: result
     * })*/
  })

  db.events.on('peer', (peer) => {
    console.log(`Peer: ${peer}`)
  })

  await db.load()
})

module.exports = router

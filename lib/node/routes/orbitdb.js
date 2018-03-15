const express = require('express')
const router = express.Router()

router.get('/', async (req, res) => {
  const address = req.query.address
  const db = await req.orbitdb.log(address, { sync: true })

  setInterval(async () => {
    const databasePeers = await req.ipfs.pubsub.peers(db.address.toString())
    console.log(`Databse Peers: ${databasePeers.length}`)
  }, 10000)

  console.log(`DB Address: ${db.address}`)

  db.events.on('synced', (res) => {
    console.log('db synced', res)
  })

  db.events.on('load.progress', (address, hash, entry, progress, total) => {
    console.log('db - load.progress', progress, total)
  })

  db.events.on('replicate', (address) => console.log('db - replicate', address ) )
  db.events.on('replicate.progress', (address) => console.log('db - replicate progress', address) )

  db.events.on('ready', () => {
    console.log('db ready')
  })

  db.events.on('updated', (res) => {
    console.log('updated')
    console.log(res)
  })

  db.events.on('replicated', (address) => {
    console.log(`Replicated: ${address}`)

    //const latest = db.iterator({ limit: 5 }).collect()
    //console.log(JSON.stringify(latest, null, 2))
  })

  db.events.on('peer', (peer) => {
    console.log(peer)
  })

  await db.load()

  //TODO: send resposne
})

module.exports = router

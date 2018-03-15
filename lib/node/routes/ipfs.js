const express = require('express')
const router = express.Router()

router.post('/swarm/connect', (req, res) => {
  const multiaddr = req.query.multiaddr
  req.ipfs.swarm.connect(multiaddr, (err, data) => {
    res.send( err ? { error: err } : { data : data })
  })
})

module.exports = router

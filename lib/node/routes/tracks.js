const express = require('express')
const router = express.Router()

const RecordLog = require('../log')

router.get('/:logAddress?', (req, res) => {
  const logAddress = req.params.logAddress

  if (!logAddress || logAddress === 'me') {
    const data = req.log.tracks.all()
    return res.send(data)
  }

  const log = new RecordLog(req.orbitdb, logAddress)
  log.load()

  const data = log.tracks.all()
  return res.send(data)
})

router.post('/:logAddress?', (req, res) => {
  const logAddress = req.params.logAddress

  //TODO: validate title
  const title = req.query.title
  const doc = {
    _id: title,
    title
  }

  if (!logAddress || logAddress === 'me') {
    const hash = req.log.tracks.add(doc)
    return res.send(hash)
  }

  const log = new RecordLog(req.orbitdb, logAddress)
  log.load()

  //TODO: validate if you have write permissions for database

  const hash = log.tracks.add(doc)
  return res.send(hash)
})

module.exports = router

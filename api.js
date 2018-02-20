const express = require('express')
const pull = require('pull-stream')
const api = express()

api.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


/* const Scuttlebot = require('./scuttlebot')
 * const sbot = Scuttlebot.start()
 * */

/* function getUser (id, cb) {
 *   pull(
 *     sbot.createUserStream({ id: id }),
 *     pull.filter((item) => {
 *       return item.value.content.type === 'about' && item.value.content.about === id
 *     }),
 *     pull.collect((err, msgs) => {
 *       var User = { id: id, messages: msgs }
 *       msgs.forEach((msg) => {
 * 	if (msg.value.content.name) User.name = msg.value.content.name
 * 	if (msg.value.content.image) User.image = msg.value.content.image
 * 	if (msg.value.content.description) User.description = msg.value.content.description
 *       })
 *       cb(err, User)
 *     })
 *   )
 * }
 * 
 * api.get('/identities/:id', (req, res) => {
 *   const id = req.params.id
 * 
 *   getUser(id, (err, msgs) => {
 *     if (err)
 *       return res.status(500).send(err)
 *     
 *     res.status(200).json(msgs)    
 *   })
 * })
 * 
 * api.get('/me', (req, res) => {
 *   res.send(sbot.whoami())
 * })
 * 
 * api.get('/tracks', (req, res) => {
 *   const opts = { type: 'post', reverse: true, limit: 20 }
 *   if (req.query.gt) opts.gt = parseInt(req.query.gt, 10)
 *   if (req.query.gte) opts.gte = parseInt(req.query.gte, 10)
 *   if (req.query.lt) opts.lt = parseInt(req.query.lt, 10)
 *   if (req.query.lte) opts.lte = parseInt(req.query.lte, 10)
 * 
 *   pull(
 *     sbot.messagesByType(opts),
 *     pull.collect((err, msgs) => {
 *       if (err)
 * 	return res.status(500).send(err)
 * 
 *       res.status(200).json(msgs)      
 *     })
 *   )
 * })
 * 
 * api.use('*', (req, res, next) => {
 *   res.send(sbot)
 * })
 * */
module.exports = api

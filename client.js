const path = require('path')
const fs = require('fs')

const ssbClient = require('ssb-client')
const ssbKeys = require('ssb-keys')
const explain = require('explain-error')

const config = require('ssb-config/inject')('record')
const keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
const manifest_file = path.join(config.path, 'manifest.json')

let manifest

try {
  manifest = JSON.parse(fs.readFileSync(manifest_file))
} catch (err) {
  throw explain(err,'no manifest file' + '- should be generated first time server is run')
}

ssbClient(keys, {
  manifest: manifest,
  port: config.port,
  host: config.host || 'localhost',
  caps: config.caps,
  key: config.key || keys.id
}, function(err, sbot) {
  if(err) {
    if (/could not connect/.test(err.message)) {
      console.log('Error: Could not connect to the scuttlebot server.')
      console.log('Use the "server" command to start it.')
      if(config.verbose) throw err
      process.exit(1)
    }
    throw err
  }

  console.log(sbot)
  console.log(sbot.id)
  
})

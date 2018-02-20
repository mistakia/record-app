const fs = require('fs')
const path = require('path')
const ssbKeys = require('ssb-keys')

const config = require('ssb-config/inject')('ssb')
const keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
const manifest_file = path.join(config.path, 'manifest.json')

const createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('ssb-friends'))
  .use(require('ssb-blobs'))
  .use(require('ssb-backlinks'))
  .use(require('ssb-private'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('ssb-query'))
  .use(require('ssb-about'))
  .use(require('ssb-contacts'))
  .use(require('./lib/progress-stream'))

config.keys = keys

module.exports = {
  start: function() {
    const server = createSbot(config)
    fs.writeFileSync(manifest_file, JSON.stringify(server.getManifest(), null, 2))
    
    return server
  }
}

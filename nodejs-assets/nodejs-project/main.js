const rnBridge = require('rn-bridge')
const os = require('os')
const path = require('path')
const debug = require('debug')
const Logger = require('logplease')
const RecordNode = require('record-node')

// Log Record / IPFS / OrbitDB
const log = debug('main')
debug.enable('main,record:*,jsipfs') // TODO: jsipfs not working?
Logger.setLogLevel(Logger.LogLevels.DEBUG)

process.on('uncaughtException', (err) => {
  console.log(err)
})

log(`Home Dir: ${os.homedir()}`)

const nodeConfig = {
  ipfsConfig: {
    config: {
      Addresses: {
	Swarm: [
	  // '/ip4/0.0.0.0/tcp/4002',
	  // '/ip4/0.0.0.0/tcp/4003/ws'
	  // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star'
	  // '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
	]
      }
    }
  }
}

// Echo every message received from react-native.
rnBridge.channel.on('message', (msg) => {
  rnBridge.channel.send(msg)
})

try {
  const node = new RecordNode(nodeConfig)

  node.on('error', function(err) {
    console.log(err)
  })

  node.on('ready', function() {
    log('RecordNode ready')
    rnBridge.channel.send('ready')
  })

} catch(e) {
  console.log(e)
}

log('initialized')

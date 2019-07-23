const fs = require('fs')
const os = require('os')
const path = require('path')
const Logger  = require('logplease')
const RecordNode = require('record-node')
const ipc = require('electron').ipcRenderer
const { app } = require('electron').remote

Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })
let record

const sendReady = () => {
  const { address, isReplicating } = record
  ipc.send('ready', { address, isReplicating })
}

try {
  const recorddir = path.resolve(os.homedir(), './.record')
  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

  const orbitAddressPath = path.resolve(recorddir, 'address.txt')
  const orbitAddress = fs.existsSync(orbitAddressPath) ?
    fs.readFileSync(orbitAddressPath, 'utf8') : 'record'

  logger.info(`Orbit Address: ${orbitAddress}`)
  let opts = {
    orbitdb: {
      directory: path.resolve(recorddir, './orbitdb')
    },
    store: {
      replicationConcurrency: 240
    },
    address: orbitAddress,
    ipfs: {
      repo: path.resolve(recorddir, './ipfs')
    },
    api: true
  }

  record = new RecordNode(opts)
  record.on('ipfs:state', (state) => ipc.send('ipfs:state', state))
  record.on('ready', async () => {
    try {
      sendReady()
      record.on('redux', (data) => {
        ipc.send('redux', data)
      })

      const log = await record.log.get()
      fs.writeFileSync(orbitAddressPath, record.address)

      setTimeout(() => {
        record.contacts.connect()
      }, 5000)

    } catch (e) {
      console.log(e)
    }
  })
} catch (err) {
  logger.error(`Error starting node: ${err.toString()}`)
  console.log(err)
}

window.onbeforeunload = async (e) => {
  if (record) {
    await record.stop()
    logger.info('record shutdown successfully')
    window.onbeforeunload = null
    app.exit()
  }
  e.returnValue = false
}

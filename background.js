const fs = require('fs')
const os = require('os')
const path = require('path')
const jsonfile = require('jsonfile')
const Logger  = require('logplease')
const RecordNode = require('record-node')
const ipc = require('electron').ipcRenderer
const { app } = require('electron').remote

Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })
logger.info(`process id: ${process.pid}`)
let record

try {
  const recorddir = path.resolve(os.homedir(), './.record')
  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

  const infoPath = path.resolve(recorddir, 'info.json')
  const info = (fs.existsSync(infoPath) && jsonfile.readFileSync(infoPath)) || {}
  const orbitAddress = info.address || 'record'
  const id = info.id

  logger.info(`ID: ${id}`)
  logger.info(`Orbit Address: ${orbitAddress}`)
  let opts = {
    keystore: path.resolve(recorddir, './keystore'),
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

  if (id) {
    opts.id = id
  }

  record = new RecordNode(opts)
  record.on('ipfs:state', (state) => ipc.send('ipfs:state', state))
  record.on('id', (data) => {
    jsonfile.writeFileSync(infoPath, {
      id: data.id,
      address: data.orbitdb.address
    }, { spaces: 2 })
  })
  record.on('ready', async (data) => {
    logger.info(data)

    try {
      ipc.send('ready', data)
      record.on('redux', (data) => {
        ipc.send('redux', data)
      })

      const log = await record.log.get()

      jsonfile.writeFileSync(infoPath, {
        id: data.id,
        address: data.orbitdb.address
      }, { spaces: 2 })

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

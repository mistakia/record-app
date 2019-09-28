const fs = require('fs')
const os = require('os')
const path = require('path')
const jsonfile = require('jsonfile')
const Logger  = require('logplease')
const debug = require('debug')
const RecordNode = require('record-node')
const electron = require('electron')
const ipc = electron.ipcRenderer
const { app } = electron.remote

debug.enable('record:*, ipfs:*')
Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })
logger.info(`process id: ${process.pid}`)
let record

const main = async () => {
  const recorddir = path.resolve(app.getPath('appData'), './record')
  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

  const infoPath = path.resolve(recorddir, 'info.json')
  const info = (fs.existsSync(infoPath) && jsonfile.readFileSync(infoPath)) || {}
  const orbitAddress = info.address || 'record'
  const id = info.id

  logger.info(`ID: ${id}`)
  logger.info(`Orbit Address: ${orbitAddress}`)
  let opts = {
    directory: recorddir,
    store: {
      replicationConcurrency: 240
    },
    address: orbitAddress,
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
  await record.init()
}

try {
  main()
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

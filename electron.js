'use strict'

const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');
const electron = require('electron')
const Logger  = require('logplease')
const path = require('path')
const os = require('os')
const fs = require('fs')
const RecordNode = require('record-node')
const debug = require('debug')

const config = require('./config/project.config')

if (config.globals.__DEV__) {
  require('electron-debug')()
}

debug.enable('ipfs,record:*')
Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })

process.on('uncaughtException', error => {
  logger.error(error)
  process.exit()
})

process.on('unhandledRejection', error => {
  logger.error(error)
  process.exit()
});

logger.info(`Electron Node version: ${process.versions.node}`)

// Module to control application life.
const app = electron.app

// const userDataPath = app.getPath('userData')
// logger.info(`User Data: ${userDataPath}`)
const recorddir = path.resolve(os.homedir(), './.record')
if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const logToRenderer = (source, level, text) => {
  if (mainWindow)
    mainWindow.webContents.send('log', source, level, text)
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    minWidth: 600,
    minHeight: 475,
    maxWidth: 1000,
    maxHeight: 800,
    show: false
  })

  const indexUrl = config.globals.__DEV__
		 ? 'http://localhost:8000/'
		 : 'file://' + __dirname + '/index.desktop.html'

  mainWindow.loadURL(indexUrl)

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null

  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

function clearData () {
  const ses = mainWindow.webContents.session
  ses.clearStorageData((err) => {
    if (err) logger.error(err)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  installExtension(REDUX_DEVTOOLS.id)
    .then((name) => logger.info(`Added Extension: ${name}`))
    .catch((err) => logger.error('An error occurred: ', err));

  createWindow()

  try {
    const orbitAddressPath = path.resolve(recorddir, 'address.txt')
    const orbitAddress = fs.existsSync(orbitAddressPath) ?
      fs.readFileSync(orbitAddressPath, 'utf8') : 'record'

    logger.info(`Orbit Address: ${orbitAddress}`)
    let opts = {
      orbitdb: {
        directory: path.resolve(recorddir, './orbitdb')
      },
      address: orbitAddress,
      ipfs: {
        repo: path.resolve(recorddir, './ipfs')
      },
      api: true
    }

    const record = new RecordNode(opts)
    record.on('ipfs:state', (state) => mainWindow.webContents.send('ipfs:state', state))
    record.on('ready', async () => {
      try {
        const log = await record.log.get()
        fs.writeFileSync(orbitAddressPath, record.address)

        mainWindow.webContents.send('ready', record.adresss)
        mainWindow.webContents.on('did-finish-load', () => {
          // TODO: check if ipfs status first
          mainWindow.webContents.send('ready', record.address)
        })
      } catch (e) {
        console.log(e)
      }
    })
  } catch (err) {
    logger.error(`Error starting node: ${err.toString()}`)
    console.log(err)
  }

  // Pass log messages to the renderer process
  Logger.events.on('data', logToRenderer)

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

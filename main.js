'use strict'

const { BrowserWindow, app, ipcMain: ipc } = require('electron')
const Logger  = require('logplease')
const path = require('path')
const os = require('os')
const debug = require('debug')

const isDev = process.env.NODE_ENV === 'development'

isDev && require('electron-debug')()

debug.enable('ipfs,record:*')
Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })

process.on('uncaughtException', error => {
  logger.error(error)
  process.exit(1)
})

process.on('unhandledRejection', error => {
  logger.error(error)
  process.exit(1)
});

logger.info(`Electron Node version: ${process.versions.node}`)
logger.info(`Development Mode: ${isDev}`)

// Module to control application life.
app.disableHardwareAcceleration()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let backgroundWindow

function createMainWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    maxWidth: 1800,
    maxHeight: 1000,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      devTools: true
    }
  })

  const indexUrl = isDev
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
app.whenReady().then(() => {
  if (isDev) {
    const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer')
    installExtension(REDUX_DEVTOOLS.id)
      .then((name) => logger.info(`Added Extension: ${name}`))
      .catch((err) => logger.error('An error occurred: ', err));
  }

  createMainWindow()

  backgroundWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      devTools: true
    }
  })

  backgroundWindow.loadFile(require('path').join(__dirname, 'background.html'))

  ipc.on('ipfs:state', (event, data) => {
    if (mainWindow) mainWindow.webContents.send('ipfs:state', data)
  })
  ipc.on('ready', (event, data) => {
    const sendReady = () => mainWindow.webContents.send('ready', data)
    sendReady()
    mainWindow.webContents.on('did-finish-load', sendReady)
  })
  ipc.on('redux', (event, data) => {
    if (data.type === 'TRACK_ADDED') {
      mainWindow.show()
    }
    if (mainWindow) mainWindow.webContents.send('redux', data)
  })

  // TODO : on loadPrivateKey from mainWindow - recreate background node
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
    createMainWindow()
  }
})

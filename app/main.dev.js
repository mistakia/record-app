'use strict'

import 'v8-compile-cache'
import electron from 'electron'
// import path from 'path'
import fixpath from 'fix-path'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

const { BrowserWindow, app, ipcMain: ipc, globalShortcut } = electron

// Only one instance can run at a time
if (!app.requestSingleInstanceLock()) {
  process.exit(0)
}

export default class AppUpdater {
  constructor () {
    log.transports.file.level = 'info'
    autoUpdater.logger = log
    autoUpdater.checkForUpdatesAndNotify()
  }
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
  fixpath()
}

if (
  process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')({
    devToolsMode: 'detach'
  })
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(log.error)
}

process.on('uncaughtException', error => {
  log.error(error)
  process.exit(1)
})

process.on('unhandledRejection', error => {
  log.error(error)
  process.exit(1)
})

ipc.on('error', () => process.exit(1))

log.info(`Electron Node version: ${process.versions.node}`)
log.info(`Development Mode: ${process.env.NODE_ENV}`)

// Module to control application life.
app.disableHardwareAcceleration()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let backgroundWindow

const createMainWindow = async () => {
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
      nodeIntegration: true
    }
    /* process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
     *   ? {
     *     nodeIntegration: true
     *   }
     *   : {
     *     preload: path.join(__dirname, 'dist/renderer.prod.js')
     *   } */
  })

  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  ipc.on('redux', (event, data) => {
    if (data.type === 'TRACK_ADDED') {
      app.dock.bounce()
    }
    if (mainWindow) mainWindow.webContents.send('redux', data)
  })

  const windowReady = new Promise((resolve) => {
    mainWindow.once('ready-to-show', resolve)
  })

  const nodeReady = new Promise((resolve) => {
    ipc.on('ready', (event, data) => resolve(data))
  })

  const [ data ] = await Promise.all([
    nodeReady,
    windowReady
  ])

  mainWindow.show()
  mainWindow.webContents.send('ready', data)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('ready', data)
  })

  // eslint-disable-next-line
  // new AppUpdater()
}

const createBackgroundWindow = () => {
  backgroundWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
    /* process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
     *   ? {
     *     nodeIntegration: true
     *   }
     *   : {
     *     preload: path.join(__dirname, 'background.prod.js')
     *   } */
  })
  backgroundWindow.loadURL(`file://${__dirname}/background.html`)
}

const registerGlobalShortcuts = () => {
  globalShortcut.register('MediaPlayPause', () => {
    if (mainWindow) mainWindow.webContents.send('redux', { type: 'MEDIA_PLAY_PAUSE' })
  })

  globalShortcut.register('MediaNextTrack', () => {
    if (mainWindow) mainWindow.webContents.send('redux', { type: 'MEDIA_NEXT' })
  })

  globalShortcut.register('MediaPreviousTrack', () => {
    if (mainWindow) mainWindow.webContents.send('redux', { type: 'MEDIA_PREVIOUS' })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  if (
    process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions()
  }

  createMainWindow()
  createBackgroundWindow()
  registerGlobalShortcuts()
  // TODO : on loadPrivateKey from mainWindow - recreate background node
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
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

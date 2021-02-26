import { autoUpdater } from 'electron-updater'
import { app, BrowserWindow, shell, dialog, Notification, ipcMain } from 'electron'
import os from 'os'

const IS_MAC = os.platform() === 'darwin'
const IS_WIN = os.platform() === 'win32'
const IS_APPIMAGE = typeof process.env.APPIMAGE !== 'undefined'

const stopIpfs = () => new Promise((resolve, reject) => {
  ipcMain.send('STOP_IPFS')
  ipcMain.on('IPFS_STOPPED', resolve)
})

export default class AppUpdater {
  constructor (log) {
    this.feedback = false
    log.transports.file.level = 'info'
    autoUpdater.logger = log
    autoUpdater.autoDownload = false
    // applicable only on Windows and Linux.
    autoUpdater.autoInstallOnAppQuit = !IS_MAC

    autoUpdater.on('error', err => {
      log.error(`[updater] ${err.toString()}`)

      if (!this.feedback) {
        return
      }

      this.feedback = false
      dialog.showMessageBoxSync({
        title: 'Could not download update',
        message: 'Failed to download the update. Please check your Internet connection and try again.',
        type: 'error',
        buttons: [ 'Close' ]
      })
    })

    autoUpdater.on('update-available', async ({ version, releaseNotes }) => {
      log.info(`[updater] update to ${version} available, download will start`)

      try {
        await autoUpdater.downloadUpdate()
      } catch (err) {
        log.error(`[updater] ${err.toString()}`)
      }

      if (!this.feedback) {
        return
      }

      // do not toggle feedback off here so we can show a dialog once the download
      // is finished.

      const opt = dialog.showMessageBoxSync({
        title: 'Update available',
        message: `A new version (${version}) of Record App is available. The download will begin shortly in the background.`,
        type: 'info',
        buttons: [
          'Close',
          'Read Release Notes'
        ],
        cancelId: 0,
        defaultId: 1
      })

      if (opt === 1) {
        shell.openExternal(`https://github.com/mistakia/record-app/releases/v${version}`)
      }
    })

    autoUpdater.on('update-not-available', ({ version }) => {
      log.info('[updater] update not available')

      if (!this.feedback) {
        return
      }

      this.feedback = false
      dialog.showMessageBoxSync({
        title: 'Update not available',
        message: `You are on the latest version of IPFS Desktop (${version})`,
        type: 'info',
        buttons: [ 'Close' ]
      })
    })

    autoUpdater.on('update-downloaded', ({ version }) => {
      log.info(`[updater] update to ${version} downloaded`)

      const { autoInstallOnAppQuit } = autoUpdater
      const install = () => {
        // Do nothing if install is handled by upstream logic
        if (autoInstallOnAppQuit) return
        // Else, do custom install handling
        setImmediate(async () => {
          // https://github.com/electron-userland/electron-builder/issues/1604#issuecomment-372091881
          if (IS_MAC) {
            app.removeAllListeners('window-all-closed')
            const browserWindows = BrowserWindow.getAllWindows()
            browserWindows.forEach(function (browserWindow) {
              browserWindow.removeAllListeners('close')
            })

            try {
              await stopIpfs()
              log.info('[quit-and-install] stopIpfs had finished with status')
            } catch (err) {
              log.error('[quit-and-install] stopIpfs had an error', err)
            }

            autoUpdater.quitAndInstall(true, true)
          }
        })
      }

      if (!this.feedback) {
        const not = new Notification({
          title: 'Update downloaded',
          body: `Update for version ${version} of IPFS Desktop downloaded. Click this notification to install.`
        })
        not.on('click', install)
        not.show()
      }

      this.feedback = false

      dialog.showMessageBoxSync({
        title: 'Update downloaded',
        message: `Update for version ${version} downloaded. To install the update, please restart Record App.`,
        type: 'info',
        buttons: [
          autoInstallOnAppQuit ? 'Ok' : 'Restart'
        ]
      })

      install()
    })
  }

  setup () {
    this.check()
    setInterval(this.check, 360000) // every hour
  }

  async check () {
    if (process.env.NODE_ENV === 'development') return

    try {
      await autoUpdater.checkForUpdates()
    } catch (_) {
      // Ignore. The errors are already handled on 'error' event.
    }
  }

  async manual () {
    if (!(IS_MAC || IS_WIN || IS_APPIMAGE)) {
      shell.openExternal('https://github.com/mistakia/record-app/releases/latest')
      return
    }

    this.feedback = true
    this.check()
  }
}

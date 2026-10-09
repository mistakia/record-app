// The native application menu (STYLE.md § OS Surface): the standard roles
// plus legacy-v0's Show Logs Folder and Show Data Folder.

import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron'

export const install_app_menu = ({ user_data, logs_dir }: { user_data: string, logs_dir: string }): void => {
  const folders: MenuItemConstructorOptions[] = [
    { label: 'Show Logs Folder', click: () => { shell.openPath(logs_dir).catch(() => {}) } },
    { label: 'Show Data Folder', click: () => { shell.openPath(user_data).catch(() => {}) } }
  ]
  // Reload and the developer tools stay out of a packaged build's menu.
  const view: MenuItemConstructorOptions[] = app.isPackaged ? [] : [{ role: 'viewMenu' }]
  const template: MenuItemConstructorOptions[] = process.platform === 'darwin'
    ? [
        {
          role: 'appMenu',
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            ...folders,
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        },
        { role: 'editMenu' },
        ...view,
        { role: 'windowMenu' }
      ]
    : [
        { label: 'File', submenu: [...folders, { type: 'separator' }, { role: 'quit' }] },
        { role: 'editMenu' },
        ...view
      ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

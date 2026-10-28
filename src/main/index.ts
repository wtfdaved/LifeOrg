import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Vault, WrongPasswordError } from './vault'

const vault = new Vault(path.join(app.getPath('userData'), 'vault.lifeorg'))
const devServerUrl = process.env['ELECTRON_RENDERER_URL']

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'LifeOrg',
    backgroundColor: '#f7f6f3',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  })

  // Nothing opens in-app windows; external links go to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!devServerUrl || !url.startsWith(devServerUrl)) event.preventDefault()
  })

  if (devServerUrl) void win.loadURL(devServerUrl)
  else void win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

// Local-only: the renderer may not talk to the network. Only the bundled app files
// (and the dev server while developing) are allowed through.
function blockNetwork(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url
    const allowed =
      url.startsWith('file:') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('devtools:') ||
      (devServerUrl !== undefined && (url.startsWith(devServerUrl) || url.startsWith(devServerUrl.replace('http', 'ws'))))
    callback({ cancel: !allowed })
  })
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string; wrongPassword?: boolean }

function handle<A extends unknown[], T>(channel: string, fn: (...args: A) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<Result<T>> => {
    try {
      return { ok: true, value: await fn(...(args as A)) }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        wrongPassword: err instanceof WrongPasswordError
      }
    }
  })
}

function registerIpc(): void {
  handle('vault:exists', () => vault.exists())
  handle('vault:create', (password: string, data: unknown) => vault.create(password, data))
  handle('vault:unlock', (password: string) => vault.unlock(password))
  handle('vault:save', (data: unknown) => vault.save(data))
  handle('vault:lock', () => vault.lock())
  handle('vault:changePassword', (oldPw: string, newPw: string) => vault.changePassword(oldPw, newPw))
  handle('vault:exportBackup', async () => {
    if (!vault.isUnlocked) throw new Error('Vault is locked')
    const stamp = new Date().toISOString().slice(0, 10)
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export encrypted backup',
      defaultPath: `lifeorg-backup-${stamp}.lifeorg`,
      filters: [{ name: 'LifeOrg vault', extensions: ['lifeorg'] }]
    })
    if (canceled || !filePath) return null
    await fs.copyFile(vault.filePath, filePath)
    return filePath
  })
  handle('vault:location', () => vault.filePath)
}

app.whenReady().then(() => {
  blockNetwork()
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await vault.lock()
  if (process.platform !== 'darwin') app.quit()
})

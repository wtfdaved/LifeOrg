import { contextBridge, ipcRenderer } from 'electron'

type Result<T> = { ok: true; value: T } | { ok: false; error: string; wrongPassword?: boolean }

const call = <T>(channel: string, ...args: unknown[]): Promise<Result<T>> => ipcRenderer.invoke(channel, ...args)

const api = {
  exists: () => call<boolean>('vault:exists'),
  create: (password: string, data: unknown) => call<void>('vault:create', password, data),
  unlock: (password: string) => call<unknown>('vault:unlock', password),
  save: (data: unknown) => call<void>('vault:save', data),
  lock: () => call<void>('vault:lock'),
  changePassword: (oldPassword: string, newPassword: string) =>
    call<void>('vault:changePassword', oldPassword, newPassword),
  exportBackup: () => call<string | null>('vault:exportBackup'),
  location: () => call<string>('vault:location')
}

export type VaultApi = typeof api

contextBridge.exposeInMainWorld('vault', api)

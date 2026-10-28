import type { VaultApi } from '../../preload/index'

declare global {
  interface Window {
    vault: VaultApi
  }
}

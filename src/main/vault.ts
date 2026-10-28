// Encrypted on-disk vault. Everything the app stores lives in one file,
// encrypted with AES-256-GCM using a key derived from the master password via scrypt.
// The key never leaves the main process; the renderer only ever sees plaintext JSON
// after a successful unlock.
import { randomBytes, scrypt as scryptCb, createCipheriv, createDecipheriv, type ScryptOptions } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const FORMAT = 'lifeorg-vault'
const VERSION = 1
const KEY_LEN = 32
const DEFAULT_KDF = { N: 2 ** 17, r: 8, p: 1 }

export interface KdfParams {
  N: number
  r: number
  p: number
}

interface VaultFile {
  format: typeof FORMAT
  version: number
  kdf: { name: 'scrypt'; salt: string } & KdfParams
  cipher: { name: 'aes-256-gcm'; iv: string; tag: string }
  data: string
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Incorrect password')
    this.name = 'WrongPasswordError'
  }
}

function deriveKey(password: string, salt: Buffer, kdf: KdfParams): Promise<Buffer> {
  const opts: ScryptOptions = { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: 128 * kdf.N * kdf.r * 2 }
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize('NFKC'), salt, KEY_LEN, opts, (err, key) => (err ? reject(err) : resolve(key)))
  )
}

function encrypt(key: Buffer, salt: Buffer, kdf: KdfParams, plaintext: string): VaultFile {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  // Bind the header to the ciphertext so it cannot be swapped out undetected.
  cipher.setAAD(Buffer.from(`${FORMAT}:${VERSION}`))
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    format: FORMAT,
    version: VERSION,
    kdf: { name: 'scrypt', salt: salt.toString('base64'), ...kdf },
    cipher: { name: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') },
    data: data.toString('base64')
  }
}

function decrypt(key: Buffer, file: VaultFile): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(file.cipher.iv, 'base64'))
  decipher.setAAD(Buffer.from(`${FORMAT}:${file.version}`))
  decipher.setAuthTag(Buffer.from(file.cipher.tag, 'base64'))
  try {
    return Buffer.concat([decipher.update(Buffer.from(file.data, 'base64')), decipher.final()]).toString('utf8')
  } catch {
    throw new WrongPasswordError()
  }
}

async function readVaultFile(filePath: string): Promise<VaultFile> {
  const file = JSON.parse(await fs.readFile(filePath, 'utf8')) as VaultFile
  if (file.format !== FORMAT || file.version !== VERSION) throw new Error('Unrecognized vault file')
  return file
}

// Write to a temp file and rename, so a crash mid-write never corrupts the vault.
async function writeAtomic(filePath: string, contents: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(tmp, contents, { mode: 0o600 })
  await fs.rename(tmp, filePath)
}

export class Vault {
  private key: Buffer | null = null
  private salt: Buffer | null = null
  private kdf: KdfParams = DEFAULT_KDF
  private queue: Promise<unknown> = Promise.resolve()

  readonly filePath: string
  private readonly newKdf: KdfParams

  constructor(filePath: string, newKdf: KdfParams = DEFAULT_KDF) {
    this.filePath = filePath
    this.newKdf = newKdf
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.filePath)
      return true
    } catch {
      return false
    }
  }

  get isUnlocked(): boolean {
    return this.key !== null
  }

  async create(password: string, initialData: unknown): Promise<void> {
    if (await this.exists()) throw new Error('A vault already exists')
    this.salt = randomBytes(16)
    this.kdf = this.newKdf
    this.key = await deriveKey(password, this.salt, this.kdf)
    await this.save(initialData)
  }

  async unlock(password: string): Promise<unknown> {
    const file = await readVaultFile(this.filePath)
    const salt = Buffer.from(file.kdf.salt, 'base64')
    const kdf = { N: file.kdf.N, r: file.kdf.r, p: file.kdf.p }
    const key = await deriveKey(password, salt, kdf)
    const plaintext = decrypt(key, file)
    this.key = key
    this.salt = salt
    this.kdf = kdf
    return JSON.parse(plaintext)
  }

  // Saves are serialized so overlapping autosaves can't interleave their writes.
  save(data: unknown): Promise<void> {
    const run = this.queue.then(async () => {
      if (!this.key || !this.salt) throw new Error('Vault is locked')
      const file = encrypt(this.key, this.salt, this.kdf, JSON.stringify(data))
      await writeAtomic(this.filePath, JSON.stringify(file))
    })
    this.queue = run.catch(() => undefined)
    return run
  }

  // Runs in the save queue so it re-encrypts the latest saved contents.
  changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const run = this.queue.then(async () => {
      const data = await this.unlock(oldPassword)
      const salt = randomBytes(16)
      const key = await deriveKey(newPassword, salt, this.newKdf)
      const file = encrypt(key, salt, this.newKdf, JSON.stringify(data))
      await writeAtomic(this.filePath, JSON.stringify(file))
      this.key?.fill(0)
      this.key = key
      this.salt = salt
      this.kdf = this.newKdf
    })
    this.queue = run.catch(() => undefined)
    return run
  }

  // Queued behind pending saves so a save issued just before locking still lands.
  lock(): Promise<void> {
    const run = this.queue.then(() => {
      this.key?.fill(0)
      this.key = null
    })
    this.queue = run
    return run
  }
}

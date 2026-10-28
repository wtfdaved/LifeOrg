import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Vault, WrongPasswordError } from '../src/main/vault.ts'

// Small scrypt cost keeps the tests fast; the app uses the much stronger default.
const FAST_KDF = { N: 2 ** 10, r: 8, p: 1 }

async function withVault(fn: (v: Vault, file: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'lifeorg-'))
  const file = path.join(dir, 'vault.lifeorg')
  try {
    await fn(new Vault(file, FAST_KDF), file)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('round-trips data and never writes plaintext', () =>
  withVault(async (vault, file) => {
    await vault.create('correct horse', { secret: 'my diary entry' })
    const raw = await readFile(file, 'utf8')
    assert.ok(!raw.includes('my diary entry'))
    await vault.lock()
    assert.deepEqual(await new Vault(file, FAST_KDF).unlock('correct horse'), { secret: 'my diary entry' })
  }))

test('rejects a wrong password', () =>
  withVault(async (vault, file) => {
    await vault.create('correct horse', { a: 1 })
    await assert.rejects(new Vault(file, FAST_KDF).unlock('wrong'), WrongPasswordError)
  }))

test('detects tampering', () =>
  withVault(async (vault, file) => {
    await vault.create('pw-12345', { a: 1 })
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    const bytes = Buffer.from(parsed.data, 'base64')
    bytes[0] ^= 1
    parsed.data = bytes.toString('base64')
    await import('node:fs/promises').then((fs) => fs.writeFile(file, JSON.stringify(parsed)))
    await assert.rejects(new Vault(file, FAST_KDF).unlock('pw-12345'), WrongPasswordError)
  }))

test('saves are serialized and lock waits for them', () =>
  withVault(async (vault, file) => {
    await vault.create('pw-12345', { n: 0 })
    const saves = [1, 2, 3, 4, 5].map((n) => vault.save({ n }))
    await vault.lock()
    await Promise.all(saves)
    assert.deepEqual(await new Vault(file, FAST_KDF).unlock('pw-12345'), { n: 5 })
    await assert.rejects(vault.save({ n: 6 }), /locked/)
  }))

test('changes the password', () =>
  withVault(async (vault, file) => {
    await vault.create('old-password', { keep: true })
    await assert.rejects(vault.changePassword('nope', 'new-password'), WrongPasswordError)
    await vault.changePassword('old-password', 'new-password')
    await vault.save({ keep: 'still' })
    await assert.rejects(new Vault(file, FAST_KDF).unlock('old-password'), WrongPasswordError)
    assert.deepEqual(await new Vault(file, FAST_KDF).unlock('new-password'), { keep: 'still' })
  }))

import { useEffect, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Settings } from '../lib/types'

export function SettingsView() {
  const { data, update, flush } = useStore()
  const [location, setLocation] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  useEffect(() => {
    void window.vault.location().then((res) => res.ok && setLocation(res.value))
  }, [])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [key]: value } }))

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw.length < 8) return setMessage({ text: 'New password must be at least 8 characters.', error: true })
    if (newPw !== confirmPw) return setMessage({ text: 'New passwords do not match.', error: true })
    await flush()
    const res = await window.vault.changePassword(oldPw, newPw)
    if (!res.ok) return setMessage({ text: res.wrongPassword ? 'Current password is incorrect.' : res.error, error: true })
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
    setMessage({ text: 'Password changed. Your vault has been re-encrypted.' })
  }

  const exportBackup = async () => {
    await flush()
    const res = await window.vault.exportBackup()
    if (!res.ok) setMessage({ text: res.error, error: true })
    else if (res.value) setMessage({ text: `Encrypted backup saved to ${res.value}` })
  }

  return (
    <div className="settings">
      <h1>Settings</h1>
      {message && <p className={message.error ? 'error' : 'success'}>{message.text}</p>}

      <section className="card">
        <h2>General</h2>
        <label>
          Theme
          <select value={data.settings.theme} onChange={(e) => set('theme', e.target.value as Settings['theme'])}>
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Week starts on
          <select value={data.settings.weekStartsOn} onChange={(e) => set('weekStartsOn', Number(e.target.value) as 0 | 1)}>
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
          </select>
        </label>
        <label>
          Auto-lock after inactivity
          <select value={data.settings.autoLockMinutes} onChange={(e) => set('autoLockMinutes', Number(e.target.value))}>
            {[1, 5, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} minute{m > 1 ? 's' : ''}
              </option>
            ))}
            <option value={0}>Never</option>
          </select>
        </label>
      </section>

      <section className="card">
        <h2>Privacy & storage</h2>
        <p className="muted">
          All data is stored in a single file encrypted with AES-256-GCM. The key is derived from your master password with
          scrypt and is never written to disk. The app blocks all network access.
        </p>
        <p>
          Vault file: <code>{location}</code>
        </p>
        <button className="btn" onClick={exportBackup}>
          Export encrypted backup…
        </button>
      </section>

      <section className="card">
        <h2>Change master password</h2>
        <form className="form" onSubmit={changePassword}>
          <input type="password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
          <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          <button className="btn primary" type="submit" disabled={!oldPw || !newPw}>
            Change password
          </button>
        </form>
      </section>
    </div>
  )
}

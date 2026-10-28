import { useEffect, useState, type FormEvent } from 'react'

interface Props {
  onUnlocked: (data: unknown) => void
  onCreate: (password: string) => Promise<void>
}

const MIN_PASSWORD = 8

export function LockScreen({ onUnlocked, onCreate }: Props) {
  const [mode, setMode] = useState<'loading' | 'unlock' | 'create'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.vault.exists().then((res) => setMode(res.ok && res.value ? 'unlock' : 'create'))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'create') {
      if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
      if (password !== confirm) return setError('Passwords do not match.')
    }
    setBusy(true)
    try {
      if (mode === 'create') {
        await onCreate(password)
      } else {
        const res = await window.vault.unlock(password)
        if (!res.ok) {
          setError(res.wrongPassword ? 'Incorrect password.' : res.error)
          return
        }
        onUnlocked(res.value)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'loading') return <div className="lock-screen" />

  return (
    <div className="lock-screen">
      <form className="lock-card" onSubmit={submit}>
        <div className="lock-logo">✦</div>
        <h1>LifeOrg</h1>
        <p className="muted">
          {mode === 'create'
            ? 'Create a master password. Your planner is encrypted with it and stored only on this computer.'
            : 'Enter your master password to unlock your planner.'}
        </p>
        <input
          type="password"
          autoFocus
          placeholder="Master password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === 'create' && (
          <>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <p className="warning">
              There is no password reset. If you forget this password, your data cannot be recovered.
            </p>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy || !password}>
          {busy ? 'Working…' : mode === 'create' ? 'Create encrypted vault' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { Settings } from './types'

export type Scheme = 'light' | 'dark'

export function useColorScheme(pref: Settings['theme']): Scheme {
  const query = '(prefers-color-scheme: dark)'
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setSystemDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  const scheme = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref
  useEffect(() => {
    document.documentElement.dataset.scheme = scheme
  }, [scheme])
  return scheme
}

import type { MoodEntry } from './types'

export const MOODS: { value: MoodEntry['mood']; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: '😞', label: 'Awful', color: '#e5484d' },
  { value: 2, emoji: '😕', label: 'Bad', color: '#f76b15' },
  { value: 3, emoji: '😐', label: 'Okay', color: '#f5d90a' },
  { value: 4, emoji: '🙂', label: 'Good', color: '#7ccf35' },
  { value: 5, emoji: '😄', label: 'Great', color: '#30a46c' }
]

export const ENERGY_LABELS = ['Drained', 'Low', 'Steady', 'Energized', 'Buzzing']

export const SUGGESTED_TAGS = ['sleep', 'exercise', 'work', 'family', 'friends', 'stress', 'outdoors', 'sick', 'creative', 'rest']

export function moodMeta(value: number) {
  return MOODS[value - 1]
}

/** Average mood over the entries whose dates fall in [from, to]. */
export function averageMood(moods: Record<string, MoodEntry>, from: string, to: string): number | null {
  const values = Object.values(moods)
    .filter((m) => m.date >= from && m.date <= to)
    .map((m) => m.mood)
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

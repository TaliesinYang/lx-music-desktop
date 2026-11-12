import fs from 'node:fs'

export interface ListeningEvent {
  id: string
  source: string
  name: string
  singer: string
  album: string
  duration: number
  playedAt: number
}

export const createHistoryStore = (file: string) => {
  let events: ListeningEvent[] = []
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error('Invalid history format')
    events = parsed as ListeningEvent[]
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error
  }
  const save = (value: ListeningEvent[]) => {
    const temporary = `${file}.tmp`
    fs.writeFileSync(temporary, JSON.stringify(value), 'utf8')
    fs.renameSync(temporary, file)
    events = value
  }
  return {
    add(event: ListeningEvent) { save([...events, event].slice(-50000)) },
    recent(limit: number) { return events.slice(-limit).reverse() },
    clear() { save([]) },
    stats(limit: number) {
      const grouped = new Map<string, ListeningEvent & { plays: number, lastPlayedAt: number }>()
      for (const event of events) {
        const key = JSON.stringify([event.source, event.id])
        const current = grouped.get(key)
        if (current) { current.plays++; current.lastPlayedAt = Math.max(current.lastPlayedAt, event.playedAt) } else grouped.set(key, { ...event, plays: 1, lastPlayedAt: event.playedAt })
      }
      return [...grouped.values()].sort((a, b) => b.plays - a.plays || b.lastPlayedAt - a.lastPlayedAt).slice(0, limit)
    },
  }
}

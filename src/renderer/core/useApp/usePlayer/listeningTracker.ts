export const createListeningTracker = () => {
  let active = false
  let counted = false
  let elapsed = 0
  let previous: { position: number, now: number } | null = null
  return {
    start() { active = true; previous = null },
    suspend() { active = false; previous = null },
    seek() { previous = null },
    reset() { active = false; counted = false; elapsed = 0; previous = null },
    sample(position: number, now: number, duration: number, rate: number): boolean {
      if (!active || counted || !Number.isFinite(position) || !Number.isFinite(now)) return false
      const old = previous
      previous = { position, now }
      if (!old) return false
      const wall = (now - old.now) / 1000
      const media = position - old.position
      const speed = Number.isFinite(rate) && rate > 0 ? rate : 1
      if (wall > 0 && media > 0 && media <= wall * speed + 1) elapsed += Math.min(wall, media / speed)
      const threshold = Number.isFinite(duration) && duration > 0 ? Math.min(30, duration / 2) : 30
      if (elapsed + 0.001 < threshold) return false
      counted = true
      return true
    },
  }
}

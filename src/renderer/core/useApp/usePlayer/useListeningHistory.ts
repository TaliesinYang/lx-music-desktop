import { onBeforeUnmount, watch } from '@common/utils/vueTools'
import { rendererInvoke } from '@common/rendererIpc'
import { getCurrentTime, getDuration, getPlaybackRate, onEnded, onPause, onPlaying, onSeeking, onTimeupdate, onWaiting } from '@renderer/plugins/player'
import { isPlay, playMusicInfo } from '@renderer/store/player/state'
import { appSetting } from '@renderer/store/setting'
import { createListeningTracker } from './listeningTracker'

export default () => {
  const tracker = createListeningTracker()
  const sample = () => {
    if (!appSetting['player.listeningHistoryEnabled']) return
    const current = playMusicInfo.musicInfo
    if (!current) return
    const info = 'progress' in current ? current.metadata.musicInfo : current
    const duration = getDuration()
    if (!tracker.sample(getCurrentTime(), performance.now(), duration, getPlaybackRate())) return
    void rendererInvoke('listening_history:add', {
      id: info.id,
      source: info.source,
      name: info.name,
      singer: info.singer,
      album: info.meta.albumName ?? '',
      duration: Number.isFinite(duration) ? duration : 0,
    }).catch(error => { console.error('Unable to save listening history', error) })
  }
  const reset = () => { tracker.reset() }
  const off = [
    onPlaying(() => { tracker.start() }),
    onPause(() => { sample(); tracker.suspend() }),
    onWaiting(() => { sample(); tracker.suspend() }),
    onSeeking(() => { tracker.seek() }),
    onTimeupdate(sample),
    onEnded(() => { sample(); tracker.reset() }),
  ]
  window.app_event.on('musicToggled', reset)
  const unwatch = watch(() => appSetting['player.listeningHistoryEnabled'], enabled => {
    tracker.reset()
    if (enabled && isPlay.value) tracker.start()
  })
  onBeforeUnmount(() => {
    for (const remove of off) remove()
    unwatch()
    window.app_event.off('musicToggled', reset)
  })
}

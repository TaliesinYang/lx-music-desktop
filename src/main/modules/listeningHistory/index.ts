import path from 'node:path'
import { mainHandle } from '@common/mainIpc'
import { createHistoryStore, type ListeningEvent } from './store'

let store: ReturnType<typeof createHistoryStore> | null = null
const getStore = () => {
  store ??= createHistoryStore(path.join(global.lxDataPath, 'listening-history.json'))
  return store
}

export const getListeningHistory = (limit: number) => getStore().recent(limit)
export const getListeningStats = (limit: number) => getStore().stats(limit)
export const clearListeningHistory = () => { getStore().clear() }

export default () => {
  mainHandle('listening_history:add', async({ params }: { params: Omit<ListeningEvent, 'playedAt'> }) => {
    if (!global.lx.appSetting['player.listeningHistoryEnabled']) return
    if (!params || typeof params.id !== 'string' || !params.id || typeof params.source !== 'string' || typeof params.name !== 'string' || typeof params.singer !== 'string' || typeof params.album !== 'string' || !Number.isFinite(params.duration)) throw new Error('Invalid listening event')
    getStore().add({ id: params.id.slice(0, 2048), source: params.source.slice(0, 100), name: params.name.slice(0, 1000), singer: params.singer.slice(0, 1000), album: params.album.slice(0, 1000), duration: Math.max(0, params.duration), playedAt: Date.now() })
  })
  mainHandle('listening_history:clear', async() => { clearListeningHistory() })
}

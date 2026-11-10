export const matchDownloads = (music: LX.Music.MusicInfoOnline, downloads: LX.Download.ListItem[]): LX.Download.ListItem[] => {
  const rank: Partial<Record<LX.Quality, number>> = { flac24bit: 4, flac: 3, '320k': 2, '128k': 1 }
  return downloads.filter(item => item.isComplate && item.metadata?.musicInfo?.source === music.source && item.metadata.musicInfo.id === music.id)
    .sort((a, b) => (rank[b.metadata.quality] ?? 0) - (rank[a.metadata.quality] ?? 0))
}

export const resolveDownloadedPath = async(music: LX.Music.MusicInfoOnline, downloads: LX.Download.ListItem[], resolvePath: (item: LX.Download.ListItem) => Promise<string>): Promise<string> => {
  for (const item of matchDownloads(music, downloads)) {
    const path = await resolvePath(item)
    if (path) return path
  }
  return ''
}

export const getPlaybackLocation = (url: string): 'Offline' | 'Online' | 'Unknown' => {
  if (/^(?:file:|[a-z]:[\\/]|\/)/i.test(url)) return 'Offline'
  if (/^https?:\/\//i.test(url)) return 'Online'
  return 'Unknown'
}

export const filterLosslessDownloadTasks = (items: LX.Download.ListItem[]): LX.Download.ListItem[] => {
  return items.filter(item => item.metadata.quality === 'flac' || item.metadata.quality === 'flac24bit')
}

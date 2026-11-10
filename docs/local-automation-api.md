# Local music automation API

Enable Open API in LX Music. The default address is `http://127.0.0.1:23330`.
The extended endpoints accept only loopback requests with `Host: 127.0.0.1`,
`localhost` or `[::1]`, no browser `Origin` header, and
`x-lx-local-control: 1`. This prevents ordinary websites from directly
calling the extended API; it does not authenticate other local applications.
The original Open API endpoints retain their existing behavior.

- `GET /search?keyword=...&source=tx&limit=10` searches a music platform.
  Source may be `kw`, `kg`, `mg`, `tx`, `wy` or `all`.
- `GET /playlists` lists user playlists.
- `GET /downloads` lists download tasks with status, quality and file path.
- `POST /downloads` with `{"musicInfos":[...],"quality":"flac","listId":"..."}`
  queues up to 20 online search results using the existing download manager.
  `listId` is optional. Quality is `128k`, `320k`, `flac`, or `flac24bit`;
  inspect task status and the completed file because source responses may downgrade.
  Existing tasks are deduplicated by the download manager.
- `POST /playlist/create` with `{"name":"..."}` creates a playlist.
- `POST /playlist/add` with `{"listId":"...","musicInfos":[...]}` adds
  song objects obtained from `/search`.
- `GET /playlist/list?listId=...` reads playlist entries.
- `GET /sources` lists installed custom source names/IDs and the active source.
- `POST /sources/select` with `{"id":"user_api_..."}` selects an installed
  custom source and returns whether initialization succeeded. This changes the
  player's source setting and should be used only as requested.
- `POST /audio/probe` with `{"musicInfo":{...},"quality":"flac24bit"}`
  resolves that search result through the active source without the URL cache
  or cross-platform fallback, then checks the returned audio header. `quality`
  may be `128k`, `320k`, `flac` or `flac24bit`. A source may itself downgrade;
  compare `requested` with the returned `format` and `bitsPerSample`. A
  `verified:false` result is unknown, not proof of a particular quality.
  Header format does not prove that the recording has never been transcoded.

The source comparison should be sequential: select a source, wait for readiness,
probe a matching song, then select the next source. Search results only contain
platform-reported metadata; the probe checks the bytes actually returned.

Playlist playback prefers a completed download with the same platform and song
ID when its file exists. Missing files fall back to online playback. This does
not infer matches across different platforms or automatically match arbitrary
files without a download record. Existing lossy downloads are also preferred.
If several completed files match, download records marked FLAC are considered
before MP3. The selected file's actual format is still detected independently.
The play bar displays `Offline` for a local file and `Online` for an HTTP(S)
source, followed by the audio format, bit depth, sample rate or bitrate when
detected from the audio header; unknown values are not inferred.

For example, in PowerShell, search for a track and queue the first result:

```powershell
$base = 'http://127.0.0.1:23330'
$headers = @{ 'x-lx-local-control' = '1' }
$keyword = [uri]::EscapeDataString('Norah Jones Sunrise')
$result = Invoke-RestMethod "$base/search?source=wy&keyword=$keyword" -Headers $headers
$body = @{ musicInfos = @($result.list[0]); quality = 'flac' } | ConvertTo-Json -Depth 40 -Compress
Invoke-RestMethod "$base/downloads" -Method Post -Headers $headers `
  -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
Invoke-RestMethod "$base/downloads" -Headers $headers
```

For `flac` and `flac24bit` requests, the API rejects the entire batch before
queueing if the download manager would choose MP3 for any requested track.
A source can still return lossy data despite a FLAC request. Verify the
completed file itself; source metadata and a `.flac` filename are not proof.
The downloader may give 16-bit and 24-bit FLAC the same filename. With
`skipExistFile` enabled, an existing file can be reused, so the requested
quality may differ from the file on disk.

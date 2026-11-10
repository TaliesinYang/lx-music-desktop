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

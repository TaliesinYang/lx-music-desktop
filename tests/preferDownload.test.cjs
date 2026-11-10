const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const source = fs.readFileSync('src/renderer/core/player/preferDownload.ts', 'utf8')
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText
const mod = {exports:{}}
new Function('module','exports',js)(mod,mod.exports)
const song = {id:'kg_1',source:'kg'}
const item = (music, complete=true) => ({isComplate:complete,metadata:{musicInfo:music}})
test('only exact completed matching source and recording is selected', () => {
 const same=item(song), live=item({id:'kg_live',source:'kg'}), other=item({id:'kg_1',source:'wy'}), pending=item(song,false)
 assert.deepEqual(mod.exports.matchDownloads(song,[live,other,pending,same]),[same])
 assert.deepEqual(mod.exports.matchDownloads(song,[live,pending]),[])
})
test('prefers a lossless download over an older lossy copy', () => {
 const mp3=item(song), flac=item(song), hires=item(song)
 mp3.metadata.quality='128k'; flac.metadata.quality='flac'; hires.metadata.quality='flac24bit'
 assert.deepEqual(mod.exports.matchDownloads(song,[mp3,flac,hires]),[hires,flac,mp3])
})
test('skips missing files and falls back when no file exists', async () => {
 const first=item(song), second=item(song)
 assert.equal(await mod.exports.resolveDownloadedPath(song,[first,second],async x => x === first ? '' : 'C:/music/song.flac'),'C:/music/song.flac')
 assert.equal(await mod.exports.resolveDownloadedPath(song,[first],async () => ''),'')
})
test('reports local and remote playback locations without guessing unknown schemes', () => {
 assert.equal(mod.exports.getPlaybackLocation('I:\\Music\\song.flac'),'Offline')
 assert.equal(mod.exports.getPlaybackLocation('file:///I:/Music/song.flac'),'Offline')
 assert.equal(mod.exports.getPlaybackLocation('https://example.com/song.flac'),'Online')
 assert.equal(mod.exports.getPlaybackLocation('custom:unknown'),'Unknown')
})

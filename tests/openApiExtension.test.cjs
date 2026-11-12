const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { EventEmitter } = require('node:events')
const http = require('node:http')
const source = fs.readFileSync('src/main/modules/openApi/index.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
const m = { exports: {} }
const calls = []
const searched = []
global.lx = { player_status: { status: 'paused' }, appSetting: {}, event_app: new EventEmitter(), worker: { dbService: { getAllUserList: async () => [{ id: 'userlist_1', name: 'Test' }] } }, event_list: { list_create: async (...a) => calls.push(['create', ...a]), list_music_add: async (...a) => calls.push(['add', ...a]) } }
const mocks = { '@main/utils/audioSourceSampleRate': { probeAudioSourceInfo: async () => ({format:'flac', formatSource:'header', sampleRate:44100, bitsPerSample:16, bitrate:null, error:null}) }, '@common/utils/nodejs': { getAddress: () => [] }, '@main/modules/winMain': { sendTaskbarButtonClick: () => {}, sendSourcesRequest: async (id) => id ? {active:id,ready:true} : {active:'user_api_a',sources:[{id:'user_api_a'}]}, sendProbeUrlRequest: async () => 'https://audio.example/test', sendPlayRequest: async () => { await new Promise(r => setTimeout(r, 4500)); return {ok:true} }, sendSearchRequest: async (source, keyword, page, limit) => { searched.push({ source, keyword, page, limit }); return { list: [{id: `${source}_1`, name:'Test', singer:'Singer'}, {id:'extra', name:'Extra', singer:'Singer'}], total:2, allPage:1 } } } }
mocks['@main/modules/listeningHistory'] = { getListeningHistory: limit => [{id:'wy_1',limit}], getListeningStats: limit => [{id:'wy_1',plays:2,limit}], clearListeningHistory: () => calls.push(['history-clear']) }
new Function('module', 'exports', 'require', 'global', js)(m, m.exports, n => mocks[n] || require(n), global)
const request = (port, pathname, options = {}) => new Promise((resolve, reject) => {
 const req = http.request({ host: '127.0.0.1', port, path: pathname, method: options.method || 'GET', headers: options.headers || {} }, res => { let data = ''; res.on('data', x => data += x); res.on('end', () => resolve({ status: res.statusCode, data })) }); req.on('error', reject); req.end(options.body)
})
mocks['@main/modules/winMain'].sendDownloadsRequest = async (musicInfos, quality) => musicInfos ? [{id:'task_1',status:'waiting',quality}] : [{id:'task_1',status:'completed'}]
test('local control guards, playlist creation, additions and multi-source searches', async () => {
 const port=24763; await m.exports.startServer(port, false)
 const headers={'x-lx-local-control':'1'}
 try {
  assert.equal((await request(port, '/playlists')).status, 403)
  assert.equal((await request(port, '/sources')).status, 403)
  assert.equal((await request(port, '/audio/probe', {method:'POST',headers:{...headers, origin:'https://example.com'}})).status, 403)
  assert.equal((await request(port, '/playlists', {headers:{...headers, origin:'https://example.com'}})).status, 403)
  assert.equal((await request(port, '/playlists', {headers:{...headers, host:'evil.example'}})).status, 403)
  assert.equal((await request(port, '/downloads')).status, 403)
  assert.equal((await request(port, '/history')).status, 403)
  assert.equal((await request(port, '/history/stats', {headers:{...headers,origin:'https://example.com'}})).status,403)
  const allowed=await request(port, '/playlists', {headers})
  assert.equal(allowed.status, 200); assert.equal(JSON.parse(allowed.data)[0].name, 'Test')
  const post={...headers,'content-type':'application/json'}
  const history=await request(port,'/history?limit=5',{headers}); assert.equal(history.status,200); assert.equal(JSON.parse(history.data)[0].limit,5)
  const stats=await request(port,'/history/stats',{headers}); assert.equal(stats.status,200); assert.equal(JSON.parse(stats.data)[0].plays,2)
  assert.equal((await request(port,'/history?limit=0',{headers})).status,400)
  assert.equal((await request(port,'/history/clear',{method:'POST',headers:post})).status,200)
  const downloads=await request(port,'/downloads',{headers}); assert.equal(downloads.status,200); assert.equal(JSON.parse(downloads.data)[0].status,'completed')
  assert.equal((await request(port,'/downloads',{method:'POST',headers:post,body:JSON.stringify({musicInfos:[{id:'x',source:'local'}],quality:'flac'})})).status,400)
  const enqueue=await request(port,'/downloads',{method:'POST',headers:post,body:JSON.stringify({musicInfos:[{id:'wy_1',source:'wy',name:'A',singer:'B',meta:{}}],quality:'flac'})}); assert.equal(enqueue.status,200); assert.equal(JSON.parse(enqueue.data).downloads[0].quality,'flac')
  const created=await request(port, '/playlist/create', {method:'POST',headers:post,body:JSON.stringify({name:'测试'})})
  assert.equal(created.status,200); assert.equal(calls.find(x=>x[0]==='create')[2][0].name,'测试')
  const added=await request(port, '/playlist/add', {method:'POST',headers:post,body:JSON.stringify({listId:'userlist_1',musicInfos:[{id:'tx_1'}]})})
  assert.equal(added.status,200); assert.equal(calls.find(x=>x[0]==='add')[1], 'userlist_1')
  const search=await request(port, '/search?keyword=test&source=tx&page=2&limit=10',{headers})
  assert.equal(search.status,200); assert.equal(JSON.parse(search.data).list[0].id,'tx_1'); assert.deepEqual(searched[0],{source:'tx',keyword:'test',page:2,limit:10})
  assert.equal(JSON.parse((await request(port,'/search?keyword=test&source=tx&limit=1',{headers})).data).list.length,1)
  const sources=await request(port,'/sources',{headers}); assert.equal(sources.status,200); assert.equal(JSON.parse(sources.data).active,'user_api_a')
  assert.equal((await request(port,'/sources/select',{method:'POST',headers:post,body:JSON.stringify({id:'bad-id'})})).status,400)
  const changed=await request(port,'/sources/select',{method:'POST',headers:post,body:JSON.stringify({id:'user_api_a'})}); assert.equal(changed.status,200); assert.equal(JSON.parse(changed.data).ready,true)
  const probe=await request(port,'/audio/probe',{method:'POST',headers:post,body:JSON.stringify({musicInfo:{id:'tx_1',source:'tx',meta:{}},quality:'flac24bit'})}); assert.equal(probe.status,200); assert.deepEqual(JSON.parse(probe.data),{requested:'flac24bit',verified:true,format:'flac',sampleRate:44100,bitsPerSample:16,bitrate:null,error:null})
  assert.equal((await request(port,'/audio/probe',{method:'POST',headers:post,body:JSON.stringify({musicInfo:{id:'x',source:'local',meta:{}},quality:'flac'})})).status,400)
  const played=await request(port, '/player/play', {method:'POST',headers:post,body:JSON.stringify({listId:'userlist_1',musicInfo:{id:'tx_1'}})})
  assert.equal(played.status,200); assert.equal(JSON.parse(played.data).ok,true)
  assert.equal((await request(port,'/search?keyword=test&source=invalid',{headers})).status,400)
  assert.equal((await request(port,'/search?keyword=test&source=tx&limit=99999',{headers})).status,400)
 } finally { await m.exports.stopServer() }
})

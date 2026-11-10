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
const mocks = { '@common/utils/nodejs': { getAddress: () => [] }, '@main/modules/winMain': { sendTaskbarButtonClick: () => {}, sendSearchRequest: async (source, keyword, page, limit) => { searched.push({ source, keyword, page, limit }); return { list: [{id: `${source}_1`, name:'Test', singer:'Singer'}, {id:'extra', name:'Extra', singer:'Singer'}], total:2, allPage:1 } } } }
new Function('module', 'exports', 'require', 'global', js)(m, m.exports, n => mocks[n] || require(n), global)
const request = (port, pathname, options = {}) => new Promise((resolve, reject) => {
 const req = http.request({ host: '127.0.0.1', port, path: pathname, method: options.method || 'GET', headers: options.headers || {} }, res => { let data = ''; res.on('data', x => data += x); res.on('end', () => resolve({ status: res.statusCode, data })) }); req.on('error', reject); req.end(options.body)
})
test('local control guards, playlist creation, additions and multi-source searches', async () => {
 const port=24763; await m.exports.startServer(port, false)
 const headers={'x-lx-local-control':'1'}
 try {
  assert.equal((await request(port, '/playlists')).status, 403)
  assert.equal((await request(port, '/playlists', {headers:{...headers, origin:'https://example.com'}})).status, 403)
  assert.equal((await request(port, '/playlists', {headers:{...headers, host:'evil.example'}})).status, 403)
  const allowed=await request(port, '/playlists', {headers})
  assert.equal(allowed.status, 200); assert.equal(JSON.parse(allowed.data)[0].name, 'Test')
  const post={...headers,'content-type':'application/json'}
  const created=await request(port, '/playlist/create', {method:'POST',headers:post,body:JSON.stringify({name:'测试'})})
  assert.equal(created.status,200); assert.equal(calls[0][2][0].name,'测试')
  const added=await request(port, '/playlist/add', {method:'POST',headers:post,body:JSON.stringify({listId:'userlist_1',musicInfos:[{id:'tx_1'}]})})
  assert.equal(added.status,200); assert.equal(calls[1][1], 'userlist_1')
  const search=await request(port, '/search?keyword=test&source=tx&page=2&limit=10',{headers})
  assert.equal(search.status,200); assert.equal(JSON.parse(search.data).list[0].id,'tx_1'); assert.deepEqual(searched[0],{source:'tx',keyword:'test',page:2,limit:10})
  assert.equal(JSON.parse((await request(port,'/search?keyword=test&source=tx&limit=1',{headers})).data).list.length,1)
  assert.equal((await request(port,'/search?keyword=test&source=invalid',{headers})).status,400)
  assert.equal((await request(port,'/search?keyword=test&source=tx&limit=99999',{headers})).status,400)
 } finally { await m.exports.stopServer() }
})

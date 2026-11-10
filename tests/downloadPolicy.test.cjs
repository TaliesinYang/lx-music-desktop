const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const source = fs.readFileSync('src/renderer/store/download/downloadPolicy.ts','utf8')
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
const mod = {exports:{}}
new Function('module','exports',js)(mod,mod.exports)
test('strict lossless rejects fallback to mp3 while allowing FLAC',()=>{
 const items = ['flac24bit','flac','320k','128k'].map(quality=>({metadata:{quality}}))
 assert.deepEqual(mod.exports.filterLosslessDownloadTasks(items).map(x=>x.metadata.quality),['flac24bit','flac'])
})

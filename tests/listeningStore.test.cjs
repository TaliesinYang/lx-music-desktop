const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs');const path = require('node:path');const os = require('node:os');const ts = require('typescript')
const source=fs.readFileSync('src/main/modules/listeningHistory/store.ts','utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
const m={exports:{}};new Function('module','exports','require',js)(m,m.exports,require)
test('persists events across restart and aggregates independent recordings',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lx-history-'));const file=path.join(dir,'history.json')
 try{let store=m.exports.createHistoryStore(file);const a={id:'a',source:'wy',name:'Song',singer:'A',album:'X',duration:200,playedAt:100};store.add(a);store.add({...a,playedAt:200});store.add({...a,id:'live',playedAt:300});store=m.exports.createHistoryStore(file);assert.equal(store.recent(10).length,3);assert.equal(store.stats(10)[0].plays,2);store.clear();assert.equal(m.exports.createHistoryStore(file).recent(10).length,0)}finally{fs.rmSync(dir,{recursive:true,force:true})}
})

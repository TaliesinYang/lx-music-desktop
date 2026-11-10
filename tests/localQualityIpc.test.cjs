const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const text = fs.readFileSync('src/main/modules/winMain/rendererEvent/music.ts','utf8')
const js = ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
let handler
const mocks={
 '@common/ipcNames':{WIN_MAIN_RENDERER_EVENT_NAME:{probe_audio_quality:'probe'}},
 '@common/mainIpc':{mainHandle:(name,fn)=>{if(name==='probe')handler=fn}},
 '@main/utils/audioSourceSampleRate':{probeAudioSourceInfo:async p=>({format:'flac',formatSource:'header',sampleRate:44100,bitsPerSample:16,bitrate:null,path:p})},
}
const m={exports:{}}
new Function('module','exports','require',js)(m,m.exports,n=>mocks[n]||require(n))
m.exports.default()
test('local audio paths can be checked and unsupported schemes stay blocked',async()=>{
 const path=require('node:path').resolve('song.flac')
 assert.equal((await handler({params:path})).format,'flac')
 assert.equal(await handler({params:'custom:unsupported'}),null)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeReviewStructure,decodeReviewStructure,selectReviewStructure } from '../examples/traex-tools/review-structure.mjs'
const binding={authority:'exact',ref:{uri:'a'.repeat(256),sha256:'a'.repeat(64),size:1024}}
const source=JSON.stringify({binding,payload:{binding,value:'中文🙂\n"quoted"\\code\n'.repeat(100)}})
const text='Full frozen review.\nREVIEW_PACKET_JSON\n'+JSON.stringify({review_id:'review',context:[{text:source},{text:source}],binding})
test('shared structure expands canonical JSON source strings and every UTF8 field exactly',()=>{
 const encoded=encodeReviewStructure(text)
 assert.equal(decodeReviewStructure(encoded.text),text)
 assert.ok(encoded.selection.canonical_json_source_texts>=2)
 assert.ok(encoded.selection.shared_references>0)
 assert.equal(encoded.selection.model_token_limit,null)
})
test('changed fields, cycles, unused values and reserved markers are refused',()=>{
 const encoded=encodeReviewStructure(text).text,position=encoded.indexOf('COMPLETE_REVIEW_STRUCTURE_V2\n')
 const prefix=encoded.slice(0,position)+'COMPLETE_REVIEW_STRUCTURE_V2\n'
 const original=JSON.parse(encoded.slice(position+'COMPLETE_REVIEW_STRUCTURE_V2\n'.length))
 const mutations=[(v:any)=>{v.values[0]={wrong:true}},(v:any)=>{v.values.push({unused:true})},(v:any)=>{v.header={$dsh_value:0};v.values[0]={$dsh_value:0}},(v:any)=>{v.header={$dsh_value:-1}}]
 for(const mutation of mutations){const value=structuredClone(original);mutation(value);assert.throws(()=>decodeReviewStructure(prefix+JSON.stringify(value)))}
 assert.throws(()=>encodeReviewStructure('REVIEW_PACKET_JSON\n'+JSON.stringify({$dsh_value:0})),/Reserved/)
})
test('full structure selection preserves system, suffix, options and retained input objects',()=>{
 const options={model:'fixed',messages:[{role:'system',content:[{type:'text',text:'rules'}]},{role:'user',id:'retained',content:[{type:'text',text}]},{role:'user',content:[{type:'text',text:'suffix'}]}]}
 const encoded=selectReviewStructure(options)
 assert.equal(encoded.options.messages[0],options.messages[0]);assert.equal(encoded.options.messages[2],options.messages[2])
 assert.equal(decodeReviewStructure(encoded.options.messages[1]!.content[0]!.text),text)
 assert.equal(options.messages[1]!.content[0]!.text,text)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {encodeReviewPackedV4,decodeReviewPackedV4,selectReviewPackedV4} from '../examples/traex-tools/review-packed-v4.mjs'
const source='{\n  "integer_ns": 1794829814238000001,\n  "one": 1.0,\n  "escaped": "\\u4e2d\\u6587",\n  "uri": "local_artifacts/project/repeated-directory/'+ 'x'.repeat(256)+'"\n}\n'
const text='Original instructions.\nREVIEW_PACKET_JSON\n'+JSON.stringify({review_id:'exact',contexts:[{text:source},{text:source}],array:[-1,0,1,['nested'],{__proto_marker:'retained'}]})
test('packed schemas preserve all field order, arrays, Unicode and numeric source lexemes exactly',()=>{
 const encoded=encodeReviewPackedV4(text);assert.equal(decodeReviewPackedV4(encoded.text),text);assert.ok(encoded.selection.object_schemas>0);assert.equal(encoded.selection.model_token_limit,null)
})
test('schema, field-count, value and exact original hash tampering are refused',()=>{
 const encoded=encodeReviewPackedV4(text).text,marker='COMPLETE_REVIEW_PACKED_V4\n',at=encoded.indexOf(marker),prefix=encoded.slice(0,at)+marker,v=JSON.parse(encoded.slice(at+marker.length))
 for(const change of [(x:any)=>x.shapes[0].push('injected'),(x:any)=>x.packed.push('extra'),(x:any)=>x.descriptor.inner_body_sha256='0'.repeat(64),(x:any)=>x.shapes.push(['unused'])]){const bad=structuredClone(v);change(bad);assert.throws(()=>decodeReviewPackedV4(prefix+JSON.stringify(bad)))}
})
test('selection preserves system, suffix, message metadata and the entire original input object',()=>{
 const o={model:'fixed',messages:[{role:'system',content:[{type:'text',text:'system'}]},{role:'user',id:'retained',content:[{type:'text',text},{type:'text',text:'other retained block'}]},{role:'user',content:[{type:'text',text:'suffix'}]}]}
 const e=selectReviewPackedV4(o);assert.equal(e.options.messages[0],o.messages[0]);assert.equal(e.options.messages[2],o.messages[2]);assert.equal(e.options.messages[1]!.id,'retained');assert.equal(decodeReviewPackedV4(e.options.messages[1]!.content[0]!.text),text);assert.equal(o.messages[1]!.content[0]!.text,text)
})

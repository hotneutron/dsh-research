import assert from 'node:assert/strict'
import test from 'node:test'
import {encodeReviewStructureV3,decodeReviewStructureV3} from '../examples/traex-tools/review-structure-v3.mjs'
const pretty='{\n  "integer_ns": 1794829814238000001,\n  "one": 1.0,\n  "word": "\\u4e2d\\u6587",\n  "path": "local_artifacts/project/repeated-long-directory/'+ 'u'.repeat(256)+'"\n}\n'
const text='Full frozen review.\nREVIEW_PACKET_JSON\n'+JSON.stringify({review_id:'exact',context:[{text:pretty},{text:pretty}],paths:Array.from({length:20},(_,i)=>'local_artifacts/project/repeated-long-directory/'+i),source:'long source\n'.repeat(100)})
test('formatted JSON preserves large integer spelling, 1.0, escapes, path prefixes and whitespace exactly',()=>{
 const encoded=encodeReviewStructureV3(text)
 assert.equal(decodeReviewStructureV3(encoded.text),text)
 assert.ok(encoded.selection.canonical_json_source_texts>=2)
 assert.ok(encoded.text.includes('1794829814238000001'))
})
test('changed lexical source overrides and original hashes fail closed',()=>{
 const encoded=encodeReviewStructureV3(text).text
 assert.throws(()=>decodeReviewStructureV3(encoded.replace('1794829814238000001','1794829814238000017')))
 assert.throws(()=>decodeReviewStructureV3(encoded.replace('"original_user_sha256":"','"original_user_sha256":"0')))
})

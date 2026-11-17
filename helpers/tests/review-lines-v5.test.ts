import assert from 'node:assert/strict'
import test from 'node:test'
import {encodeReviewLinesV5,decodeReviewLinesV5,selectReviewLinesV5} from '../examples/traex-tools/review-lines-v5.mjs'
import {selectReviewEncoding} from '../examples/traex-tools/review-literal.mjs'

const repeated='        /*1590*/                   CS2R R6, SR_CLOCKLO ;                         /* 0x0000000000067805 */\r\n'
const sass='UTF8 中文 λ \u0000\n'+repeated.repeat(40)+'unique line\r\n'+repeated.repeat(40)
const source='{\n  "integer_ns": 1794829814238000001,\n  "one": 1.0,\n  "escaped": "\\u4e2d\\u6587"\n}\n'
const text='Original instructions.\nREVIEW_PACKET_JSON\n'+JSON.stringify({contexts:[{text:sass},{text:source}],array:[-1,0,{retained:true}],last:'field order stays'})

test('shared lines retain exact SASS, CRLF, Unicode, numeric source lexemes and field order',()=>{
 const encoded=encodeReviewLinesV5(text)
 assert.equal(decodeReviewLinesV5(encoded.text),text)
 assert.ok(encoded.selection.shared_source_lines>0)
 assert.ok(encoded.selection.encoded_chars<text.length)
 assert.equal(encoded.selection.model_token_limit,null)
 assert.deepEqual(encodeReviewLinesV5(text),encoded)
})

test('dictionary bytes, unused lines, frame identity and original hashes cannot be changed',()=>{
 const encoded=encodeReviewLinesV5(text).text,marker='COMPLETE_REVIEW_LINES_V5\n',at=encoded.indexOf(marker)
 const prefix=encoded.slice(0,at)+marker,v=JSON.parse(encoded.slice(at+marker.length))
 for(const mutate of [(x:any)=>x.lines[0]+='changed',(x:any)=>x.lines.push('unused'),(x:any)=>x.lines[0]=1,
   (x:any)=>x.descriptor.inner_body_sha256='0'.repeat(64),(x:any)=>x.descriptor.original_user_sha256='0'.repeat(64)]){
  const bad=structuredClone(v);mutate(bad);assert.throws(()=>decodeReviewLinesV5(prefix+JSON.stringify(bad)))
 }
 function frame(value:any):any{
  if(value&&typeof value==='object'&&Object.hasOwn(value,'$dsh_lines_v5'))return value
  for(const child of Object.values(value??{})){if(child&&typeof child==='object'){const found=frame(child);if(found)return found}}
 }
 for(const badReference of [-1,999999,1.5,null,{not:'a line'}]){
  const bad=structuredClone(v);frame(bad.packed).$dsh_lines_v5[0]=badReference
  assert.throws(()=>decodeReviewLinesV5(prefix+JSON.stringify(bad)))
 }
 const bad=structuredClone(v);frame(bad.packed).unreviewed='extra';assert.throws(()=>decodeReviewLinesV5(prefix+JSON.stringify(bad)))
})

test('selection keeps every other block, system, suffix, metadata and original input',()=>{
 const options={model:'fixed',messages:[{role:'system',content:[{type:'text',text:'system'}]},
  {role:'user',id:'original',content:[{type:'text',text},{type:'text',text:'retained second block'}]},
  {role:'user',content:[{type:'text',text:'suffix'}]}]}
 const before=structuredClone(options),encoded=selectReviewLinesV5(options)
 assert.equal(encoded.options.messages[0],options.messages[0]);assert.equal(encoded.options.messages[2],options.messages[2])
 assert.equal(encoded.options.messages[1]!.content[1],options.messages[1]!.content[1]);assert.equal(encoded.options.messages[1]!.id,'original')
 assert.equal(decodeReviewLinesV5(encoded.options.messages[1]!.content[0]!.text),text);assert.deepEqual(options,before)
 assert.deepEqual(selectReviewEncoding(options,{reviewerEncodingMode:'complete_review_lines_v5'}),encoded)
 assert.deepEqual(selectReviewEncoding(options,{}),{options,selection:null})
})

test('packets with no reusable lines remain exact and do not require dictionary entries',()=>{
 const simple='REVIEW_PACKET_JSON\n'+JSON.stringify({value:123,source:'a unique source'})
 const encoded=encodeReviewLinesV5(simple);assert.equal(encoded.selection.shared_source_lines,0)
 assert.equal(decodeReviewLinesV5(encoded.text),simple)
})

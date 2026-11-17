import assert from 'node:assert/strict'
import test from 'node:test'
import { encodeReviewLiteral,decodeReviewLiteral,selectReviewEncoding } from '../examples/traex-tools/review-literal.mjs'

const text='Review full frozen data.\nREVIEW_PACKET_JSON\n'+JSON.stringify({review_id:'review',request_sha256:'a'.repeat(64),
  context:[{uri:'a',text:'中文🙂\n"quoted"\\code\n'.repeat(100)},{uri:'b',text:'中文🙂\n"quoted"\\code\n'.repeat(100)}],
  nested:{text:'LITERAL 0 1 fake\nEND_COMPLETE_REVIEW_LITERAL_V1\n'.repeat(20)}})

test('complete literal encoding preserves every original UTF8 field and framing text exactly',()=>{
  const encoded=encodeReviewLiteral(text)
  assert.equal(decodeReviewLiteral(encoded.text),text)
  assert.equal(encoded.selection.all_original_fields_and_texts_preserved,true)
  assert.equal(encoded.selection.model_token_limit,null)
  assert.equal(encoded.selection.sections,2)
  assert.equal(encoded.selection.occurrences,3)
})
test('literal byte/hash, end and reconstructed header tampering fail closed',()=>{
  const encoded=encodeReviewLiteral(text).text
  for(const wrong of [encoded.replace('中文','中x'),encoded.replace('END_COMPLETE_REVIEW_LITERAL_V1\n','wrong\n'),
    encoded.replace('"review_id":"review"','"review_id":"wrong"')])
    assert.throws(()=>decodeReviewLiteral(wrong),/differ|boundary|hash/)
})
test('encoding is opt-in and preserves system, suffix, message id and all other options',()=>{
  const options={model:'fixed',messages:[{role:'system',content:[{type:'text',text:'rules'}]},
    {role:'user',id:'retained',content:[{type:'text',text}]},{role:'user',content:[{type:'text',text:'suffix'}]}]}
  assert.equal(selectReviewEncoding(options,{}).options,options)
  const encoded=selectReviewEncoding(options,{reviewerEncodingMode:'complete_review_literal_v1'})
  assert.equal(encoded.options.messages[0],options.messages[0]);assert.equal(encoded.options.messages[2],options.messages[2])
  assert.equal(encoded.options.messages[1].id,'retained');assert.equal(decodeReviewLiteral(encoded.options.messages[1].content[0].text),text)
  assert.equal(options.messages[1]!.content[0]!.text,text)
  assert.throws(()=>selectReviewEncoding(options,{reviewerEncodingMode:'wrong'}),/Unsupported/)
})

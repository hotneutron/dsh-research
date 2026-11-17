import assert from 'node:assert/strict'
import test from 'node:test'
import {encodeModelContext,decodeModelContext} from '../src/model-context.js'
const context={system:'exact system\n'.repeat(50),messages:[{role:'user',id:'retained',content:[{type:'text',text:'中文🙂 "code"\n'.repeat(100)}]},{role:'user',content:[{type:'text',text:'suffix'}]}]}
test('literal native context retains all fields, roles, UTF8, quotes and suffix exactly',()=>assert.deepEqual(decodeModelContext(encodeModelContext(context)),context))
test('literal native context tamper and truncated boundary fail closed',()=>{
 const text=encodeModelContext(context)
 assert.throws(()=>decodeModelContext(text.replace('中文','中x')))
 assert.throws(()=>decodeModelContext(text.slice(0,-2)))
})

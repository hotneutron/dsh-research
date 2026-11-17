import {createHash} from 'node:crypto'
import {encodeReviewStructureV3,decodeReviewStructureV3} from './review-structure-v3.mjs'
const marker='COMPLETE_REVIEW_PACKED_V4\n',innerMarker='COMPLETE_REVIEW_STRUCTURE_V3\n'
const digest=text=>createHash('sha256').update(Buffer.from(text)).digest('hex')
export function encodeReviewPackedV4(text){
 const inner=encodeReviewStructureV3(text),at=inner.text.indexOf(innerMarker),prefix=inner.text.slice(0,at),innerBody=inner.text.slice(at+innerMarker.length),body=JSON.parse(innerBody),shapes=[],seen=new Map();let objects=0,arrays=0
 const pack=value=>{
  if(Array.isArray(value)){arrays++;return [-1,...value.map(pack)]}
  if(value&&typeof value==='object'){
   objects++;const keys=Object.keys(value),key=JSON.stringify(keys);let id=seen.get(key)
   if(id===undefined){id=shapes.length;seen.set(key,id);shapes.push(keys)}
   return [id,...Object.values(value).map(pack)]
  }
  return value
 }
 const packed=pack(body),descriptor={format:'complete_review_packed_v4',inner_body_sha256:digest(innerBody),original_user_sha256:digest(text),
  interpretation:'This is the COMPLETE original review, losslessly represented with shared ordered JSON object schemas. In packed, every array with first element -1 is an original array: recursively expand the remaining elements. Every array with first element a nonnegative schema id is an object: shapes[id] lists its exact property names in original order, and the remaining elements supply their recursively expanded values. Rebuild every field, then follow the contained complete_review_structure_v3 descriptor for shared values, exact JSON source formatting/numeric spellings and path prefixes. No fields, source text or evidence are omitted. Use the unchanged native review instructions and return the original requested output schema.'}
 const encoded=prefix+marker+JSON.stringify({descriptor,shapes,packed})
 if(decodeReviewPackedV4(encoded)!==text)throw new Error('Packed complete review differs from original bytes')
 return {text:encoded,selection:{...inner.selection,mode:'complete_review_packed_v4',encoded_chars:encoded.length,object_schemas:shapes.length,packed_objects:objects,packed_arrays:arrays,encoded_user_sha256:digest(encoded),all_original_fields_and_texts_preserved:true,durable_history_mutated:false,model_token_limit:null}}
}
export function decodeReviewPackedV4(text){
 const at=text.indexOf(marker);if(at<0)throw new Error('Packed review marker missing')
 const prefix=text.slice(0,at),{descriptor,shapes,packed}=JSON.parse(text.slice(at+marker.length))
 if(descriptor?.format!=='complete_review_packed_v4'||!Array.isArray(shapes))throw new Error('Packed review descriptor invalid')
 for(const keys of shapes)if(!Array.isArray(keys)||keys.some(key=>typeof key!=='string')||new Set(keys).size!==keys.length)throw new Error('Packed object schema invalid')
 const used=new Set()
 const unpack=value=>{
  if(Array.isArray(value)){
   const id=value[0];if(!Number.isSafeInteger(id))throw new Error('Packed node identity invalid')
   if(id===-1)return value.slice(1).map(unpack)
   if(id<0||id>=shapes.length||value.length!==shapes[id].length+1)throw new Error('Packed object field count differs')
   used.add(id);return Object.fromEntries(shapes[id].map((key,index)=>[key,unpack(value[index+1])]))
  }
  if(value&&typeof value==='object')throw new Error('Unframed packed object refused')
  return value
 }
 const innerBody=JSON.stringify(unpack(packed));if(used.size!==shapes.length||digest(innerBody)!==descriptor.inner_body_sha256)throw new Error('Expanded packed review differs')
 const original=decodeReviewStructureV3(prefix+innerMarker+innerBody)
 if(digest(original)!==descriptor.original_user_sha256)throw new Error('Original packed review identity differs')
 return original
}
export function selectReviewPackedV4(options){
 let selected=-1,blockIndex=-1
 for(let i=0;i<(options.messages??[]).length;i++)if(options.messages[i].role==='user')for(let j=0;j<(options.messages[i].content??[]).length;j++)if(options.messages[i].content[j].type==='text'&&options.messages[i].content[j].text.includes('REVIEW_PACKET_JSON\n')){selected=i;blockIndex=j}
 if(selected<0)return {options,selection:null}
 const encoded=encodeReviewPackedV4(options.messages[selected].content[blockIndex].text)
 return {options:{...options,messages:options.messages.map((m,i)=>i!==selected?m:{...m,content:m.content.map((b,j)=>j!==blockIndex?b:{...b,text:encoded.text})})},selection:encoded.selection}
}

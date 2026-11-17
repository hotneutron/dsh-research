import { createHash } from 'node:crypto'

const marker='COMPLETE_REVIEW_STRUCTURE_V2\n',originalMarker='REVIEW_PACKET_JSON\n'
const digest=value=>createHash('sha256').update(Buffer.from(value)).digest('hex')
const reserved=['$dsh_value','$dsh_json_text']

export function encodeReviewStructure(text) {
  const index=text.lastIndexOf(originalMarker)
  if(index<0)throw new Error('Complete frozen review packet required')
  const prefix=text.slice(0,index),packetText=text.slice(index+originalMarker.length),packet=JSON.parse(packetText)
  if(JSON.stringify(packet)!==packetText)throw new Error('Exact reversible packet serialization required')
  const values=[],byText=new Map();let jsonTexts=0,sharedReferences=0
  const encode=value=>{
    if(typeof value==='string'&&value.length>=256) {
      let parsed,canonical=false
      try {parsed=JSON.parse(value);canonical=JSON.stringify(parsed)===value} catch {}
      if(canonical) {jsonTexts++;return {$dsh_json_text:encode(parsed)}}
    }
    if(value&&typeof value==='object') {
      if(reserved.some(key=>Object.hasOwn(value,key)))throw new Error('Reserved structure marker already present')
      const node=Array.isArray(value)?value.map(encode):Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]))
      const key=JSON.stringify(node)
      if(key.length>=128) {
        let id=byText.get(key)
        if(id!==undefined)sharedReferences++
        else {id=values.length;byText.set(key,id);values.push(node)}
        return {$dsh_value:id}
      }
      return node
    }
    return value
  }
  const header=encode(packet)
  const descriptor={format:'complete_review_structure_v2',
    interpretation:'This is the COMPLETE original review packet with reversible shared values. Replace each sole-key {"$dsh_value":id} by values[id], recursively. A sole-key {"$dsh_json_text":tree} denotes the exact source text obtained by JSON.stringify of the expanded tree, preserving field order. All source fields, text, identities and instructions are retained. Read the full expanded contents and return the original requested output schema.',
    original_user_sha256:digest(text),original_packet_sha256:digest(packetText),json_source_texts:jsonTexts,shared_references:sharedReferences}
  const encoded=prefix+marker+JSON.stringify({descriptor,header,values})
  if(decodeReviewStructure(encoded)!==text)throw new Error('Shared review roundtrip differs from original bytes')
  return {text:encoded,selection:{mode:'complete_review_structure_v2',original_chars:text.length,encoded_chars:encoded.length,
    dictionary_values:values.length,canonical_json_source_texts:jsonTexts,shared_references:sharedReferences,
    original_packet_sha256:descriptor.original_packet_sha256,original_user_sha256:descriptor.original_user_sha256,
    encoded_user_sha256:digest(encoded),all_original_fields_and_texts_preserved:true,durable_history_mutated:false,model_token_limit:null}}
}

export function decodeReviewStructure(text) {
  const index=text.indexOf(marker)
  if(index<0)throw new Error('Shared review marker missing')
  const prefix=text.slice(0,index),{descriptor,header,values}=JSON.parse(text.slice(index+marker.length))
  if(descriptor?.format!=='complete_review_structure_v2'||!Array.isArray(values))throw new Error('Shared review descriptor invalid')
  const used=new Set(),expanding=new Set(),memo=new Map()
  const restore=value=>{
    if(Array.isArray(value))return value.map(restore)
    if(value&&typeof value==='object') {
      if(Object.hasOwn(value,'$dsh_value')) {
        const id=value.$dsh_value
        if(Object.keys(value).length!==1||!Number.isSafeInteger(id)||id<0||id>=values.length)throw new Error('Shared value reference invalid')
        used.add(id)
        if(expanding.has(id))throw new Error('Shared value cycle refused')
        if(memo.has(id))return memo.get(id)
        expanding.add(id);const decoded=restore(values[id]);expanding.delete(id);memo.set(id,decoded);return decoded
      }
      if(Object.hasOwn(value,'$dsh_json_text')) {
        if(Object.keys(value).length!==1)throw new Error('JSON source text marker invalid')
        return JSON.stringify(restore(value.$dsh_json_text))
      }
      return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,restore(item)]))
    }
    return value
  }
  const packetText=JSON.stringify(restore(header)),original=prefix+originalMarker+packetText
  if(used.size!==values.length||digest(packetText)!==descriptor.original_packet_sha256||digest(original)!==descriptor.original_user_sha256)
    throw new Error('Reconstructed complete review differs')
  return original
}

export function selectReviewStructure(options) {
  let selected=-1,blockIndex=-1
  for(let i=0;i<(options.messages??[]).length;i++) {
    if(options.messages[i].role!=='user')continue
    for(let j=0;j<(options.messages[i].content??[]).length;j++)
      if(options.messages[i].content[j].type==='text'&&options.messages[i].content[j].text.includes(originalMarker)){selected=i;blockIndex=j}
  }
  if(selected<0)return {options,selection:null}
  const encoded=encodeReviewStructure(options.messages[selected].content[blockIndex].text)
  const messages=options.messages.map((message,i)=>i!==selected?message:{...message,content:message.content.map((block,j)=>j!==blockIndex?block:{...block,text:encoded.text})})
  return {options:{...options,messages},selection:encoded.selection}
}

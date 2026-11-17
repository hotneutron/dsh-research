import { createHash } from 'node:crypto'
import { selectReviewStructure } from './review-structure.mjs'
import { selectReviewStructureV3 } from './review-structure-v3.mjs'
import { selectReviewPackedV4 } from './review-packed-v4.mjs'
import { selectReviewLinesV5 } from './review-lines-v5.mjs'

const marker = 'COMPLETE_REVIEW_LITERAL_V1\n'
const originalMarker = 'REVIEW_PACKET_JSON\n'
const digest = value => createHash('sha256').update(value).digest('hex')

export function encodeReviewLiteral(text) {
  const index = text.lastIndexOf(originalMarker)
  if (index < 0) throw new Error('Complete frozen review packet required')
  const prefix = text.slice(0,index), packetText = text.slice(index+originalMarker.length)
  const packet = JSON.parse(packetText)
  if (JSON.stringify(packet) !== packetText) throw new Error('Exact reversible packet serialization required')
  const sections=[], byText=new Map();let occurrences=0
  const extract = value => {
    if (typeof value === 'string' && value.length >= 256) {
      occurrences++
      let id=byText.get(value)
      if (id===undefined) {id=sections.length;byText.set(value,id);sections.push(value)}
      return {$dsh_literal:id}
    }
    if (Array.isArray(value)) return value.map(extract)
    if (value && typeof value==='object') {
      if (Object.hasOwn(value,'$dsh_literal')) throw new Error('Reserved literal marker already present')
      return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,extract(item)]))
    }
    return value
  }
  const header=extract(packet)
  const descriptor={format:'complete_review_literal_v1',
    interpretation:'The next JSON line is the complete review packet. Replace each sole-key {"$dsh_literal":id} with the exact UTF-8 string in LITERAL id below. Shared references denote identical strings. All original fields and texts are retained. Review those full contents under the unchanged instructions and return the original requested output schema.',
    sections:sections.length,occurrences,
    original_user_sha256:digest(Buffer.from(text)),original_packet_sha256:digest(Buffer.from(packetText))}
  let encoded=prefix+marker+JSON.stringify(descriptor)+'\n'+JSON.stringify(header)+'\n'
  sections.forEach((section,id)=>{
    const bytes=Buffer.from(section)
    encoded+='LITERAL '+id+' '+bytes.length+' '+digest(bytes)+'\n'+section+'\n'
  })
  encoded+='END_COMPLETE_REVIEW_LITERAL_V1\n'
  if (decodeReviewLiteral(encoded)!==text) throw new Error('Literal review roundtrip differs from original bytes')
  return {text:encoded,selection:{mode:'complete_review_literal_v1',original_chars:text.length,
    encoded_chars:encoded.length,sections:sections.length,occurrences,
    original_packet_sha256:descriptor.original_packet_sha256,
    original_user_sha256:descriptor.original_user_sha256,encoded_user_sha256:digest(Buffer.from(encoded)),
    all_original_fields_and_texts_preserved:true,durable_history_mutated:false,model_token_limit:null}}
}

export function decodeReviewLiteral(text) {
  const position=text.indexOf(marker)
  if(position<0) throw new Error('Literal review marker missing')
  const prefix=text.slice(0,position),body=Buffer.from(text.slice(position+marker.length));let cursor=0
  const line=()=>{const end=body.indexOf(10,cursor);if(end<0)throw new Error('Incomplete literal framing');const result=body.subarray(cursor,end).toString();cursor=end+1;return result}
  const descriptor=JSON.parse(line()),header=JSON.parse(line()),sections=[]
  if(descriptor.format!=='complete_review_literal_v1'||!Number.isSafeInteger(descriptor.sections)||descriptor.sections<0)
    throw new Error('Literal review descriptor invalid')
  for(let id=0;id<descriptor.sections;id++) {
    const match=/^LITERAL (\d+) (\d+) ([0-9a-f]{64})$/.exec(line())
    if(!match||Number(match[1])!==id)throw new Error('Literal section identity differs')
    const size=Number(match[2]);if(!Number.isSafeInteger(size)||size<0||cursor+size>=body.length)throw new Error('Literal section length invalid')
    const bytes=body.subarray(cursor,cursor+size);cursor+=size
    if(body[cursor++]!==10||digest(bytes)!==match[3])throw new Error('Literal section bytes/hash differ')
    const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes)
    if(!Buffer.from(decoded).equals(bytes))throw new Error('Literal text encoding differs')
    sections.push(decoded)
  }
  if(line()!=='END_COMPLETE_REVIEW_LITERAL_V1'||cursor!==body.length)throw new Error('Literal end boundary differs')
  const used=new Set();let occurrences=0
  const restore=value=>{
    if(Array.isArray(value))return value.map(restore)
    if(value&&typeof value==='object') {
      if(Object.hasOwn(value,'$dsh_literal')) {
        const id=value.$dsh_literal
        if(Object.keys(value).length!==1||!Number.isSafeInteger(id)||id<0||id>=sections.length)throw new Error('Literal header reference invalid')
        used.add(id);occurrences++;return sections[id]
      }
      return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,restore(item)]))
    }
    return value
  }
  const packetText=JSON.stringify(restore(header)),original=prefix+originalMarker+packetText
  if(used.size!==sections.length||occurrences!==descriptor.occurrences||digest(Buffer.from(packetText))!==descriptor.original_packet_sha256
    ||digest(Buffer.from(original))!==descriptor.original_user_sha256)throw new Error('Reconstructed complete review differs')
  return original
}

export function selectReviewEncoding(options,controls) {
  if(controls.reviewerEncodingMode===undefined)return {options,selection:null}
  if(controls.reviewerEncodingMode==='complete_review_lines_v5')return selectReviewLinesV5(options)
  if(controls.reviewerEncodingMode==='complete_review_packed_v4')return selectReviewPackedV4(options)
  if(controls.reviewerEncodingMode==='complete_review_structure_v3')return selectReviewStructureV3(options)
  if(controls.reviewerEncodingMode==='complete_review_structure_v2')return selectReviewStructure(options)
  if(controls.reviewerEncodingMode!=='complete_review_literal_v1')throw new Error('Unsupported complete review encoding')
  let selected=-1,blockIndex=-1
  for(let i=0;i<(options.messages??[]).length;i++) {
    if(options.messages[i].role!=='user')continue
    for(let j=0;j<(options.messages[i].content??[]).length;j++)
      if(options.messages[i].content[j].type==='text'&&options.messages[i].content[j].text.includes(originalMarker)){selected=i;blockIndex=j}
  }
  if(selected<0)return {options,selection:null}
  const encoded=encodeReviewLiteral(options.messages[selected].content[blockIndex].text)
  const messages=options.messages.map((message,i)=>i!==selected?message:{...message,content:message.content.map((block,j)=>j!==blockIndex?block:{...block,text:encoded.text})})
  return {options:{...options,messages},selection:encoded.selection}
}

// ## Revision History
// 2026-11-16T13:00:00Z: Support separately qualified shared structure representation for growing complete review packets; keep literal v1 and historical defaults.

// ## Revision History
// 2026-11-16T19:37:56.752974+00:00: Add optional shared-line codec; existing default/v1/v2/v3/v4 modes remain exact.

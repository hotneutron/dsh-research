import {createHash} from 'node:crypto'
import {encodeReviewPackedV4,decodeReviewPackedV4} from './review-packed-v4.mjs'
const marker='COMPLETE_REVIEW_LINES_V5\n',innerMarker='COMPLETE_REVIEW_PACKED_V4\n',tag='$dsh_lines_v5'
const digest=text=>createHash('sha256').update(Buffer.from(text)).digest('hex')
const split=text=>text.match(/[^\n]*\n|[^\n]+$/g)??[]

export function encodeReviewLinesV5(text){
 const inner=encodeReviewPackedV4(text),at=inner.text.indexOf(innerMarker),prefix=inner.text.slice(0,at),innerBody=inner.text.slice(at+innerMarker.length),body=JSON.parse(innerBody)
 const counts=new Map()
 const visit=value=>{
  if(typeof value==='string'&&value.length>256&&value.includes('\n'))for(const line of split(value))counts.set(line,(counts.get(line)??0)+1)
  else if(Array.isArray(value))value.forEach(visit)
  else if(value&&typeof value==='object'){
   if(Object.hasOwn(value,tag))throw new Error('Reserved shared-line object refused')
   Object.values(value).forEach(visit)
  }
 }
 visit(body)
 const candidates=[...counts].filter(([line,n])=>n>=2&&(JSON.stringify(line).length-8)*(n-1)>64)
 candidates.sort((a,b)=>(JSON.stringify(b[0]).length-8)*(b[1]-1)-(JSON.stringify(a[0]).length-8)*(a[1]-1)||(a[0]<b[0]?-1:a[0]>b[0]?1:0))
 const lines=candidates.map(([line])=>line),ids=new Map(lines.map((line,id)=>[line,id]));let references=0,strings=0
 const pack=value=>{
  if(typeof value==='string'&&value.length>256&&value.includes('\n')){
   const chunks=split(value).map(line=>ids.has(line)?ids.get(line):line)
   // Every selected line is retained. A frame can be larger for one string,
   // while still reducing repeated lines across the complete packet.
   if(chunks.some(chunk=>typeof chunk==='number')){
    references+=chunks.filter(chunk=>typeof chunk==='number').length;strings++;return {[tag]:chunks}
   }
  }
  if(Array.isArray(value))return value.map(pack)
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,pack(v)]))
  return value
 }
 const packed=pack(body),descriptor={format:'complete_review_lines_v5',inner_body_sha256:digest(innerBody),original_user_sha256:digest(text),
  interpretation:'This is the COMPLETE original review with exact shared source lines over complete_review_packed_v4. For each sole-key $dsh_lines_v5 object, concatenate its chunks in order: a string is literal exact text; an integer id means lines[id]. Line endings, indentation, SASS instruction addresses/operands/encodings and every original byte are retained. Expand all line objects, then follow the packed_v4 and contained v3 descriptors for exact object fields/order, JSON numeric spellings and source strings. No sources, evidence, context or fields are omitted. Apply the unchanged original review instructions and output schema.'}
 const encoded=prefix+marker+JSON.stringify({descriptor,lines,packed})
 if(decodeReviewLinesV5(encoded)!==text)throw new Error('Shared-line review differs from original bytes')
 return {text:encoded,selection:{...inner.selection,mode:'complete_review_lines_v5',encoded_chars:encoded.length,shared_source_lines:lines.length,
  shared_line_references:references,line_framed_strings:strings,encoded_user_sha256:digest(encoded),all_original_fields_and_texts_preserved:true}}
}

export function decodeReviewLinesV5(text){
 const at=text.indexOf(marker);if(at<0)throw new Error('Shared-line marker missing')
 const prefix=text.slice(0,at),{descriptor,lines,packed}=JSON.parse(text.slice(at+marker.length))
 if(descriptor?.format!=='complete_review_lines_v5'||!Array.isArray(lines)||lines.some(line=>typeof line!=='string')||new Set(lines).size!==lines.length)throw new Error('Shared-line dictionary invalid')
 const used=new Set()
 const unpack=value=>{
  if(Array.isArray(value))return value.map(unpack)
  if(value&&typeof value==='object'){
   if(Object.hasOwn(value,tag)){
    if(Object.keys(value).length!==1||!Array.isArray(value[tag]))throw new Error('Shared-line frame invalid')
    return value[tag].map(chunk=>{
     if(typeof chunk==='string')return chunk
     if(!Number.isSafeInteger(chunk)||chunk<0||chunk>=lines.length)throw new Error('Shared-line reference invalid')
     used.add(chunk);return lines[chunk]
    }).join('')
   }
   return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,unpack(v)]))
  }
  return value
 }
 const innerBody=JSON.stringify(unpack(packed))
 if(used.size!==lines.length||digest(innerBody)!==descriptor.inner_body_sha256)throw new Error('Expanded shared-line review differs')
 const original=decodeReviewPackedV4(prefix+innerMarker+innerBody)
 if(digest(original)!==descriptor.original_user_sha256)throw new Error('Original shared-line review differs')
 return original
}

export function selectReviewLinesV5(options){
 let selected=-1,blockIndex=-1
 for(let i=0;i<(options.messages??[]).length;i++)if(options.messages[i].role==='user')for(let j=0;j<(options.messages[i].content??[]).length;j++)if(options.messages[i].content[j].type==='text'&&options.messages[i].content[j].text.includes('REVIEW_PACKET_JSON\n')){selected=i;blockIndex=j}
 if(selected<0)return {options,selection:null}
 const encoded=encodeReviewLinesV5(options.messages[selected].content[blockIndex].text)
 return {options:{...options,messages:options.messages.map((m,i)=>i!==selected?m:{...m,content:m.content.map((b,j)=>j!==blockIndex?b:{...b,text:encoded.text})})},selection:encoded.selection}
}

import { createHash } from 'node:crypto'

const marker='COMPLETE_REVIEW_STRUCTURE_V3\n',originalMarker='REVIEW_PACKET_JSON\n'
const digest=value=>createHash('sha256').update(Buffer.from(value)).digest('hex')
const reserved=['$dsh_value','$dsh_json_text','$dsh_json_source_v3','$dsh_path']


const tokenPattern=/\s+|"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/gy
function tokens(text) {
  const result=[];let index=0
  while(index<text.length) {tokenPattern.lastIndex=index;const m=tokenPattern.exec(text);if(!m||m.index!==index)throw new Error('JSON source token framing invalid');result.push(m[0]);index=tokenPattern.lastIndex}
  return result
}
function serialize(value,style,suffix) {
  if(style==='python_compact')return tokens(JSON.stringify(value)).map(t=>t===','||t===':'?t+' ':t).join('')+suffix
  return JSON.stringify(value,null,style)+suffix
}
function sourceRecipe(text,parsed) {
  const original=tokens(text)
  for(const style of [2,4,0,'python_compact'])for(const suffix of ['\n','']) {
    const base=tokens(serialize(parsed,style,suffix))
    if(base.length!==original.length)continue
    const overrides=[];let valid=true
    for(let i=0;i<base.length;i++) {
      if(base[i]===original[i])continue
      if(/^\s/.test(base[i])||/^\s/.test(original[i])) {valid=false;break}
      try {if(JSON.parse(base[i])!==JSON.parse(original[i])) {valid=false;break}}catch {valid=false;break}
      overrides.push([i,original[i]])
    }
    if(valid)return {style,suffix,overrides}
  }
  return null
}
function restoreSource(tree,recipe) {
  const base=tokens(serialize(tree,recipe.style,recipe.suffix)),used=new Set()
  if(!Array.isArray(recipe.overrides))throw new Error('JSON source overrides invalid')
  for(const pair of recipe.overrides) {
    if(!Array.isArray(pair)||pair.length!==2)throw new Error('JSON source override tuple invalid')
    const [id,text]=pair
    if(!Number.isSafeInteger(id)||id<0||id>=base.length||used.has(id)||typeof text!=='string')throw new Error('JSON source override identity invalid')
    if(JSON.parse(base[id])!==JSON.parse(text))throw new Error('JSON source lexical override changes value')
    base[id]=text;used.add(id)
  }
  return base.join('')
}

export function encodeReviewStructureV3(text) {
  const index=text.lastIndexOf(originalMarker)
  if(index<0)throw new Error('Complete frozen review packet required')
  const prefix=text.slice(0,index),packetText=text.slice(index+originalMarker.length),packet=JSON.parse(packetText)
  if(JSON.stringify(packet)!==packetText)throw new Error('Exact reversible packet serialization required')
  const counts=new Map()
  const collect=value=>{
    if(typeof value==='string') {
      if(value.length>=256){try{collect(JSON.parse(value));return}catch{}}
      if(/^(?:\/|[A-Za-z][A-Za-z0-9_.-]*\/)/.test(value))for(let i=value.indexOf('/');i>=0;i=value.indexOf('/',i+1)) {
        const prefix=value.slice(0,i+1);if(prefix.length>=16&&prefix.length<=200)counts.set(prefix,(counts.get(prefix)??0)+1)
      }
    } else if(Array.isArray(value))value.forEach(collect)
    else if(value&&typeof value==='object')Object.values(value).forEach(collect)
  }
  collect(packet)
  const pathPrefixes=[...counts].filter(([p,n])=>(p.length-24)*n-p.length>128).sort((a,b)=>((b[0].length-24)*b[1]-b[0].length)-((a[0].length-24)*a[1]-a[0].length)).slice(0,64).map(([p])=>p)
  const values=[],byText=new Map();let jsonTexts=0,sharedReferences=0
  const encode=value=>{
    if(typeof value==='string'&&value.length>=256) {
      let parsed,canonical=false
      try {parsed=JSON.parse(value);canonical=JSON.stringify(parsed)===value} catch {}
      if(canonical) {jsonTexts++;return {$dsh_json_text:encode(parsed)}}
      if(parsed!==undefined) {const recipe=sourceRecipe(value,parsed);if(recipe){jsonTexts++;return {$dsh_json_source_v3:{tree:encode(parsed),recipe}}}}
    }
    if(typeof value==='string') {
      let chosen=-1
      for(let id=0;id<pathPrefixes.length;id++)if(value.startsWith(pathPrefixes[id])&&(chosen<0||pathPrefixes[id].length>pathPrefixes[chosen].length))chosen=id
      if(chosen>=0)return {$dsh_path:[chosen,value.slice(pathPrefixes[chosen].length)]}
      if(value.length>=256) {
        const key='string:'+value;let id=byText.get(key)
        if(id===undefined){id=values.length;byText.set(key,id);values.push(value)}else sharedReferences++
        return {$dsh_value:id}
      }
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
  const descriptor={format:'complete_review_structure_v3',path_prefixes:pathPrefixes,
    interpretation:'This is the COMPLETE original review packet with reversible shared values. Replace each sole-key {"$dsh_value":id} by values[id], recursively. A sole-key {"$dsh_json_text":tree} denotes the exact source text obtained by JSON.stringify of the expanded tree, preserving field order. A sole-key $dsh_json_source_v3 contains tree and recipe: expand tree, serialize with the exact indentation/style and suffix, then replace numbered JSON tokens with the literal overrides. Overrides preserve original number spellings, including integers beyond exact floating point precision, and escaped strings. A sole-key $dsh_path:[id,suffix] is the exact string path_prefixes[id]+suffix. All source fields, text, identities and instructions are retained. Read the full expanded contents and return the original requested output schema.',
    original_user_sha256:digest(text),original_packet_sha256:digest(packetText),json_source_texts:jsonTexts,shared_references:sharedReferences}
  const encoded=prefix+marker+JSON.stringify({descriptor,header,values})
  if(decodeReviewStructureV3(encoded)!==text)throw new Error('Shared review roundtrip differs from original bytes')
  return {text:encoded,selection:{mode:'complete_review_structure_v3',original_chars:text.length,encoded_chars:encoded.length,
    dictionary_values:values.length,canonical_json_source_texts:jsonTexts,shared_references:sharedReferences,
    original_packet_sha256:descriptor.original_packet_sha256,original_user_sha256:descriptor.original_user_sha256,
    encoded_user_sha256:digest(encoded),all_original_fields_and_texts_preserved:true,durable_history_mutated:false,model_token_limit:null}}
}

export function decodeReviewStructureV3(text) {
  const index=text.indexOf(marker)
  if(index<0)throw new Error('Shared review marker missing')
  const prefix=text.slice(0,index),{descriptor,header,values}=JSON.parse(text.slice(index+marker.length))
  if(descriptor?.format!=='complete_review_structure_v3'||!Array.isArray(values))throw new Error('Shared review descriptor invalid')
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
      if(Object.hasOwn(value,'$dsh_path')) {
        const pair=value.$dsh_path
        if(Object.keys(value).length!==1||!Array.isArray(pair)||pair.length!==2||!Number.isSafeInteger(pair[0])||pair[0]<0||pair[0]>=descriptor.path_prefixes.length||typeof pair[1]!=='string')throw new Error('Exact path prefix reference invalid')
        return descriptor.path_prefixes[pair[0]]+pair[1]
      }
      if(Object.hasOwn(value,'$dsh_json_source_v3')) {
        if(Object.keys(value).length!==1)throw new Error('JSON source recipe marker invalid')
        return restoreSource(restore(value.$dsh_json_source_v3.tree),value.$dsh_json_source_v3.recipe)
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

export function selectReviewStructureV3(options) {
  let selected=-1,blockIndex=-1
  for(let i=0;i<(options.messages??[]).length;i++) {
    if(options.messages[i].role!=='user')continue
    for(let j=0;j<(options.messages[i].content??[]).length;j++)
      if(options.messages[i].content[j].type==='text'&&options.messages[i].content[j].text.includes(originalMarker)){selected=i;blockIndex=j}
  }
  if(selected<0)return {options,selection:null}
  const encoded=encodeReviewStructureV3(options.messages[selected].content[blockIndex].text)
  const messages=options.messages.map((message,i)=>i!==selected?message:{...message,content:message.content.map((block,j)=>j!==blockIndex?block:{...block,text:encoded.text})})
  return {options:{...options,messages},selection:encoded.selection}
}

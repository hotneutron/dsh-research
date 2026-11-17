export function modelRequestByteLimit(controls) {
  const limit = controls.maxRequestBytes ?? 1024 * 1024
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('Positive finite model request capture bound required')
  return limit
}

export async function readModelRequest(stream, maxBytes = 1024 * 1024) {
  const pieces = []; let bytes = 0
  for await (const chunk of stream) {
    const piece = Buffer.from(chunk); bytes += piece.length
    if (bytes > maxBytes) throw new Error('Model request capture bound exceeded')
    pieces.push(piece)
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(pieces)))
}

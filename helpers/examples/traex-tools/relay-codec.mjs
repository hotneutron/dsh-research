export async function readModelRequest(stream, maxBytes = 1024 * 1024) {
  const pieces = []; let bytes = 0
  for await (const chunk of stream) {
    const piece = Buffer.from(chunk); bytes += piece.length
    if (bytes > maxBytes) throw new Error('Model request capture bound exceeded')
    pieces.push(piece)
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(pieces)))
}

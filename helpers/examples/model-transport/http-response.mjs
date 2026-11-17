// Empty NDJSON lines preserve transport liveness without producing model chunks.
export function beginModelResponse(response, heartbeatMs = 30000) {
  if (!Number.isSafeInteger(heartbeatMs) || heartbeatMs <= 0) throw new Error('Positive finite heartbeat interval required')
  response.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' })
  response.flushHeaders()
  const timer = setInterval(() => {
    if (response.destroyed || response.writableEnded) { stop(); return }
    response.write('\n')
  }, heartbeatMs)
  timer.unref()
  const stop = () => { clearInterval(timer); response.off('close', stop) }
  response.once('close', stop)
  return stop
}

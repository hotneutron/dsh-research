/** Scientific meaning belongs to this synthetic project domain, never the package reducer. */
export async function verify(result) {
  if (typeof result.score !== 'number' || !Number.isFinite(result.score)) throw new Error('Finite score required')
  return result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'inconclusive'
}

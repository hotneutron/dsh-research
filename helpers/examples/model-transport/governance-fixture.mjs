// Explicit fixture authority only. This is not a production auth/exposure decision.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function createGovernance({ projectRoot, routes, helpers, config }) {
  const marker = JSON.parse(await readFile(join(projectRoot, 'fixture-marker.json'), 'utf8'))
  if (marker.kind !== 'disposable_model_protocol_qualification' || marker.external_model_calls !== 0)
    throw new Error('Disposable model governance marker required')
  const { canonicalJson, sha256, contextEntries } = helpers
  return {
    async verifyRoute(route) {
      const codexFixture = route.driver.id === 'codex-app-server-v1' && route.driver.version === 'fixture-1'
        && route.driver.codex?.home === projectRoot && route.authentication.protected_reference === projectRoot
        && route.driver.executable.path === join(projectRoot, 'fixture-cli.mjs')
      if (codexFixture) {
        try { await readFile(join(projectRoot, 'auth.json')); throw new Error('Fixture home cannot contain a real account credential') }
        catch (error) { if (error.code !== 'ENOENT') throw error }
      }
      if (route.authentication.class !== 'scripted_fixture' || route.authentication.principal !== 'fixture-only'
        || route.authentication.protected_reference !== 'fixture:no-credential' && !codexFixture || route.provider !== 'fixture-provider')
        throw new Error('Fixture authority cannot approve a real provider/auth route')
      return { route_sha256: sha256(canonicalJson(route)), authority: route.exposure.authority }
    },
    async approveContext(route, context) {
      return { context_sha256: sha256(canonicalJson(context)), decision: route.exposure.decision,
        before_read: config.fixture_before_read,
        entries: contextEntries(context).map(entry => ({ ...entry, content_class: 'released' })),
        author_session_id: 'fixture-author', reviewer_session_id: 'fixture-reviewer' }
    },
  }
}

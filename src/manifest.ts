import { mkdir, open, readFile, realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { ByteRef, ManifestSchema } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { sha256, verifyBytes, verifyManifest } from './bindings.js'

/** Ordinary project files; no implicit project root, mutable overwrite or package-global cache. */
export class ProjectArtifacts {
  private constructor(readonly root: string, readonly maxReadBytes: number, private readonly readPrefixes: readonly string[] | null = null) {}
  static async open(root: string, maxReadBytes = 4 * 1024 * 1024): Promise<ProjectArtifacts> {
    if (!isAbsolute(root) || !Number.isSafeInteger(maxReadBytes) || maxReadBytes <= 0) throw new Error('Explicit absolute project root and positive capture limit required')
    return new ProjectArtifacts(await realpath(root), maxReadBytes)
  }
  withReadPrefixes(prefixes: readonly string[]): ProjectArtifacts {
    if (!prefixes.length || prefixes.some(prefix => !prefix.endsWith('/') || isAbsolute(prefix) || prefix.split(/[\\/]/).includes('..')))
      throw new Error('Nonempty relative artifact read prefixes required')
    return new ProjectArtifacts(this.root, this.maxReadBytes, [...prefixes])
  }
  private inside(path: string): boolean {
    const rel = relative(this.root, path)
    return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
  }
  private lexical(uri: string): string {
    if (isAbsolute(uri) || uri.includes('\0') || uri.split(/[\\/]/).includes('..')) throw new Error('Artifact reference must stay under its project root')
    const path = resolve(this.root, uri)
    if (!this.inside(path)) throw new Error('Artifact path escapes the project root')
    return path
  }
  async read(ref: ArtifactReference): Promise<Uint8Array> {
    ByteRef.parse(ref)
    if (this.readPrefixes !== null && !this.readPrefixes.some(prefix => ref.uri.startsWith(prefix))) throw new Error('Artifact is outside the profile permitted read scope')
    const path = await realpath(this.lexical(ref.uri))
    if (!this.inside(path)) throw new Error('Artifact symlink escapes the project root')
    if ((await stat(path)).size > this.maxReadBytes) throw new Error('Artifact exceeds the declared capture limit')
    const bytes = await readFile(path)
    if (bytes.byteLength > this.maxReadBytes) throw new Error('Artifact grew beyond the declared capture limit')
    verifyBytes(ref, bytes)
    return bytes
  }
  async write(uri: string, bytes: Uint8Array): Promise<ArtifactReference> {
    const path = this.lexical(uri)
    // Check an existing ancestor before mkdir, then the final parent before writing.
    let ancestor = dirname(path)
    while (true) {
      try {
        if (!this.inside(await realpath(ancestor))) throw new Error('Artifact parent escapes the project root')
        break
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        ancestor = dirname(ancestor)
      }
    }
    await mkdir(dirname(path), { recursive: true, mode: 0o700 })
    if (!this.inside(await realpath(dirname(path)))) throw new Error('Artifact parent escapes the project root')
    const handle = await open(path, 'wx', 0o600)
    try { await handle.writeFile(bytes); await handle.sync() } finally { await handle.close() }
    return { uri, sha256: sha256(bytes), size_bytes: bytes.byteLength }
  }
}

export async function loadManifest(ref: ArtifactReference, artifacts: ProjectArtifacts): Promise<Manifest> {
  const bytes = await artifacts.read(ref)
  const input: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'))
  // Parse the manifest before reading any input. Unsupported protected access fails here.
  const manifest = ManifestSchema.parse(input)
  if (manifest.binding.authority.project_root !== artifacts.root) throw new Error('Manifest is bound to a different canonical project')
  return verifyManifest(manifest, await artifacts.read(manifest.binding.contract_ref.artifact), await artifacts.read(manifest.binding.compatibility_row_ref.register))
}

export function identityReferences(manifest: Manifest): ArtifactReference[] {
  return [manifest.goal.context, manifest.plan.snapshot, manifest.architecture,
    manifest.candidate.tree, manifest.candidate.configuration, manifest.candidate.content_inventory,
    manifest.evaluator.verifier, manifest.evaluator.interpreter, manifest.evaluator.environment,
    manifest.output.schema, manifest.domain_policy, manifest.bounds.resource_policy,
    manifest.binding.profile.effective, manifest.binding.profile.lock,
    ...manifest.binding.profile.releases.map(r => r.content), ...manifest.inputs.map(i => i.artifact),
    ...manifest.proposal.prerequisites]
}

/** Each identity resolves its exact frozen bytes; callers repeat this after execution. */
export async function verifyIdentity(manifest: Manifest, artifacts: ProjectArtifacts): Promise<void> {
  for (const ref of identityReferences(manifest)) await artifacts.read(ref)
}

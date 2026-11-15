import { resolve } from 'node:path'
import { z } from 'zod'
import { Count, Id } from './records.js'
import type { ArtifactReference, Manifest } from './records.js'
import { canonicalJson } from './bindings.js'

/** The host freezes argument structure; model proposals cannot supply shell programs. */
export const InvocationTemplateSchema = z.strictObject({
  arguments: z.array(z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('entrypoint') }),
    z.strictObject({ kind: z.literal('input'), index: Count }),
    z.strictObject({ kind: z.literal('operation') }),
    z.strictObject({ kind: z.literal('literal'), value: z.string() }),
  ])).min(1),
  input_count: Count.positive(), input_purpose: Id,
  environment: z.record(Id, z.string()),
  cost_purpose: z.enum(['C_science', 'C_qual']),
}).superRefine((value, ctx) => {
  if (value.arguments.filter(a => a.kind === 'entrypoint').length !== 1)
    ctx.addIssue({ code: 'custom', message: 'Exactly one frozen producer entrypoint is required' })
  if (value.arguments.filter(a => a.kind === 'operation').length !== 1)
    ctx.addIssue({ code: 'custom', message: 'Exactly one declared operation is required' })
  const inputs = value.arguments.filter(a => a.kind === 'input')
  if (inputs.some(a => a.index >= value.input_count)
    || new Set(inputs.map(a => a.index)).size !== value.input_count)
    ctx.addIssue({ code: 'custom', message: 'Every declared input must occur in the template and indexes must be in range' })
})
export type InvocationTemplate = z.infer<typeof InvocationTemplateSchema>

export function invocationArguments(template: InvocationTemplate, root: string, entrypoint: ArtifactReference,
  inputs: readonly ArtifactReference[], operation: string): string[] {
  InvocationTemplateSchema.parse(template)
  if (inputs.length !== template.input_count) throw new Error('Invocation input count differs from the frozen template')
  return template.arguments.map(argument => {
    switch (argument.kind) {
      case 'entrypoint': return resolve(root, entrypoint.uri)
      case 'input': return resolve(root, inputs[argument.index]!.uri)
      case 'operation': return operation
      case 'literal': return argument.value
    }
  })
}

/** Preserve the historical three-argument profile when no template is declared. */
export function assertInvocation(manifest: Manifest, root: string, policy: {
  entrypoint: ArtifactReference; allowed_executables: string[]; allowed_operations: string[];
  execution?: InvocationTemplate | undefined;
}) {
  if (resolve(manifest.invocation.cwd) !== root || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(manifest.goal.id))
    throw new Error('Execution profile requires canonical project cwd and a safe goal ID')
  if (!policy.allowed_executables.includes(manifest.invocation.executable)
    || !policy.allowed_operations.includes(manifest.proposal.operation))
    throw new Error('Invocation exceeds the standing executable or operation scope')
  if (policy.execution) {
    const expected = invocationArguments(policy.execution, root, policy.entrypoint,
      manifest.inputs.map(input => input.artifact), manifest.proposal.operation)
    if (canonicalJson(manifest.invocation.argv) !== canonicalJson(expected)
      || canonicalJson(manifest.invocation.env) !== canonicalJson(policy.execution.environment)
      || manifest.inputs.some(input => input.access !== 'released' || input.purpose !== policy.execution!.input_purpose))
      throw new Error('Invocation differs from the frozen production argument/input/environment template')
  } else if (manifest.inputs.length !== 1 || manifest.invocation.argv.length !== 3
    || manifest.invocation.argv[0] !== resolve(root, policy.entrypoint.uri)
    || manifest.invocation.argv[1] !== resolve(root, manifest.inputs[0]!.artifact.uri)
    || manifest.invocation.argv[2] !== manifest.proposal.operation)
    throw new Error('Invocation does not match the pinned producer/input/operation template')
}

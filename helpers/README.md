# dsh-research helpers

This directory contains the reusable TypeScript package. The repository root owns canonical docs, skills and engineering plans.

Run the pinned pnpm version here to install, build, typecheck and test. Building copies canonical contracts, compatibility metadata, integration guidance and the research skill into `dist/`; these generated files travel with the tarball. Core exports use `dsh-research`; native tools use `dsh-research/native`.

```sh
npx --yes pnpm@11.7.0 install --frozen-lockfile --ignore-scripts
npx --yes pnpm@11.7.0 build
npx --yes pnpm@11.7.0 typecheck
npx --yes pnpm@11.7.0 test
```

The execution adapter accepts synthetic CPU and bounded GPU qualification policies. GPU guards bind existing leases and native settlement; scientific adoption remains a separate qualified project route. `auditContinuity` is a conservative read-only snapshot check; writer changes and feedback cursor advances need separately verified handoff or scan-chain evidence.

Building also distributes default profile/service preparation and GET-only Source transport tools in `dist/`. The default web-bundle qualification example uses the public prototype plugin's persistent Store and native DshExecutor; its fixture CLI and scripted models are confined to a fresh disposable project. See [integration guidance](../docs/integration.md) for installed-consumer pins and project-owned deployment controls.

The `m3:default` script runs the automatic proposal, separate review and feedback workflow on a pinned disposable default consumer. It accepts `--runtime` and `--output` paths, freezes a finite qualification matrix and reports exact evidence coverage. The standalone `m4:smoke` script exercises reviewer timeout, lost association and delayed acknowledgement; its scope remains separate from default-worker observations.

Use `--fault <case>` with the default-runtime runner for one frozen native failure/recovery stratum. The optional `dsh-research/traex` export supports text-only native planning through existing TraeX authentication, with explicit request/deadline/capture bounds and native usage. It rejects native tools. Requests use finite counts/deadlines/capture limits and record actual usage; output-token caps are not applied, and legacy token hints are explicitly recorded as ignored. See integration guidance for exact scope and private recovery rules.

The optional `dsh-research/traex-tools` export projects structured model choices into native DSH tool calls while keeping CLI tools disabled. Configure a bounded request count/deadline and one call per turn for the qualified engineering route. Native argument validation and project guards still run per call. Output-token caps are not applied; request/deadline/capture controls and usage tracking remain active. Run `node examples/traex-tools/run.mjs <fresh-project-root> <authenticated-traecli>` to qualify one model-selected synthetic research action through the public AgentLoop harness. The review is scripted, and this example uses disposable engineering authority. See [integration guidance](../docs/integration.md#traex-model-selected-native-tools) for the transport and scientific adoption boundaries.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-12 11:04:59 -0800 | Added GPU qualification and state/guard integration to the package overview. |
| r2 | 2026-11-12 15:00 -0800 | Documented distributed default-deployment tools and the actual public-plugin qualification consumer. |
| r3 | 2026-11-12 18:03:35 -0800 | Added automatic default-worker and scoped fault qualification entry points. |
| r4 | 2026-11-12T20:15:20.440063-08:00 | Documented failure/cold-recovery and authenticated text-only planning entry points and supported controls. |
| r5 | 2026-11-12T21:17:00-08:00 | Added bounded model-selected native tool projection and engineering example; native scientific output caps remain unsupported. |
| r6 | 2026-11-12T22:16:54.920421-08:00 | Removed the mandatory reviewer token-cap requirement and transport refusal; documented explicit legacy-hint handling and retained bounded-request controls. |

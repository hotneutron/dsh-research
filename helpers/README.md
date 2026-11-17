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

Use `--fault <case>` with the default-runtime runner for a declared native failure/recovery stratum.

The model transport API is `dsh-research/model-transport` (`ModelTextAdapter`, `ModelRouteSchema`, `ModelRequestBudget`), with `ModelToolAdapter` in `dsh-research/model-tools` and `TraexDriver`, `CodexDriver` and `ClaudeDriver` in `dsh-research/model-drivers/{traex,codex,claude}`. Supply trusted project authorization/classification hooks, exact route pins, role and exposure/auth evidence, byte bounds and a shared model budget. The fixture governance module is explicitly not real authorization. CLI tools stay disabled; DSH owns execution, and native IDs are persisted before projection. Output tokens are uncapped; failures and unknown usage remain charged.

See [integration guidance](../docs/integration.md#pluggable-model-transport) for configuration and the native mechanism qualification. The removed `traex`/`traex-tools` APIs have no compatibility shims. Old deployed consumers remain pinned until their separate state/route handoff is qualified.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-12 11:04:59 -0800 | Added GPU qualification and state/guard integration to the package overview. |
| r2 | 2026-11-12 15:00 -0800 | Documented distributed default-deployment tools and the actual public-plugin qualification consumer. |
| r3 | 2026-11-12 18:03:35 -0800 | Added automatic default-worker and scoped fault qualification entry points. |
| r4 | 2026-11-12T20:15:20.440063-08:00 | Documented failure/cold-recovery and authenticated text-only planning entry points and supported controls. |
| r5 | 2026-11-12T21:17:00-08:00 | Added bounded model-selected native tool projection and engineering example; native scientific output caps remain unsupported. |
| r6 | 2026-11-12T22:16:54.920421-08:00 | Removed the mandatory reviewer token-cap requirement and transport refusal; documented explicit legacy-hint handling and retained bounded-request controls. |
| r7 | 2026-11-17T03:08:26.060475-08:00 | Replaced prototype TraeX exports with the governed shared transport, explicit role bindings and scoped driver; retained project-owned qualification and history. |

| r8 | 2026-11-17T11:48:03.884746-08:00 | Added the Codex driver and mixed relay bindings; native local-endpoint qualification remains separate from live account/host adoption. |

| r9 | 2026-11-17T13:24:41.402481-08:00 | Added Claude bare-mode transport with protected API auth, raw response usage, native framing bound and shared DSH relay/qualification. |

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

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-12 11:04:59 -0800 | Added GPU qualification and state/guard integration to the package overview. |
| r2 | 2026-11-12 15:00 -0800 | Documented distributed default-deployment tools and the actual public-plugin qualification consumer. |
| r3 | 2026-11-12 18:03:35 -0800 | Added automatic default-worker and scoped fault qualification entry points. |

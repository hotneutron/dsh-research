# dsh-research helpers

This directory contains the reusable TypeScript package. The repository root owns canonical docs, skills and engineering plans.

Run the pinned pnpm version here to install, build, typecheck and test. Building copies canonical contracts, compatibility metadata, integration guidance and the research skill into `dist/`; these generated files travel with the tarball. Core exports use `dsh-research`; native tools use `dsh-research/native`.

```sh
npx --yes pnpm@11.7.0 install --frozen-lockfile --ignore-scripts
npx --yes pnpm@11.7.0 build
npx --yes pnpm@11.7.0 typecheck
npx --yes pnpm@11.7.0 test
```

The current execution adapter accepts the synthetic CPU policy. Project integration preparations do not enable a live scientific route. `auditContinuity` is a conservative read-only snapshot check; writer changes and feedback cursor advances need separately verified handoff or scan-chain evidence.

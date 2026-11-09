# Disk cleanup: conservative package-cache pass

Created: 2026-11-05 16:20 -0800. Status: cache-only cleanup complete; repositories and research evidence preserved.

## Request and scope

Cleared regenerable pip/npm download caches using their native tools. No repository, research output, dataset, confirmation record, installed environment, toolchain, Git state, compiled-kernel cache or temporary experiment directory was deleted.

## Actions and measurements

- `python3 -m pip --cache-dir /home/cliu/.cache/pip cache purge`: exit 0; 1,137 files/49 directories removed; reported 3,393.1 MB. Remaining pip metadata/cache footprint: approximately 7.4 MB.
- `npm cache clean --force --cache /home/cliu/.npm`: exit 0; `_cacache` removed; `_npx` and installed tools left untouched. The `--force` warning is required by npm cache-clean semantics.
- Measured free space immediately before these commands: 95.43 GiB; after: 100.89 GiB; increase during the purge batch: **5.46 GiB**.
- Final filesystem check: approximately **101 GiB available**, **94% used**, versus the initial inspection of 118 MB available/100% used. Space had already increased between the initial inspection and this purge batch; that additional change is not attributed to this cleanup.

## Deliberately retained

- `/home/cliu/.cache/uv` (approximately 7.8 GiB). A symlink scan found no detected references in accessible paths, but 99 temporary directories were inaccessible; do not claim a complete dependency check or delete the cache under that uncertainty.
- Conda package storage/environments, Triton LLVM/NVIDIA toolchains and compiled caches, model/dataset caches, editor/server installations and all `/tmp` experiment material.
- Large research directories including Amora `out` (~144 GiB), Bytesim `local_artifacts` (~123 GiB), and Accorde reports/evaluation/artifacts. Their sizes are not authorization to discard evidence. Any larger reclamation needs an explicit retention/deletion scope.

## User Prompt, Verbatim

```text
cleanup the disk
```


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-05 16:20 -0800 | Recorded the exact request, non-destructive disk/cache inspection, native pip/npm cache purges, measured space increase and conservative retention decisions. Distinguished independently changing free space from this cleanup batch. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-1620-note-disk-cleanup.md to 261105-1620-note-disk-cleanup.md using YYMMDD-HHMM; updated 0 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |

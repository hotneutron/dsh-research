# Packet and outcome guidance

Address immutable files by `{uri, sha256, size_bytes}` relative to canonical P. A filename alone is insufficient. Pin contract bytes, the compatibility register/table/row, effective profile and runtime releases. Preserve historical bindings when any obligation/profile changes.

The model tool accepts exactly:

```json
{
  "manifest": {"uri": "local_artifacts/autoresearch/dsh/goal/manifest.json", "sha256": "<exact-byte-sha256>", "size_bytes": 123},
  "review": {"uri": "local_artifacts/autoresearch/dsh/goal/review.json", "sha256": "<exact-byte-sha256>", "size_bytes": 456},
  "expected_revision": 0
}
```

Replace every example value with the actual retained file identity; do not submit placeholders. The host owns policy, reviewer verification, storage and executable scope. The adapter refuses missing registered state and unsupported protected inputs.

| Returned phase | Interpretation and next step |
|---|---|
| settled | Fetch the retained evidence/checkpoint, verify bytes and distinguish execution validity from domain verdict. Prepare a new reviewed action when needed. |
| admitted/dispatching/running | Reconcile the original native association; do not invoke another evaluator. |
| unknown | Keep consumed history and reservation; resolve actual native ownership/terminal facts. Reassessment time grants no launch authority. |
| replay=true | This is the original logical attempt, with its original job/evidence/checkpoint. It consumes nothing new. |

The current synthetic example demonstrates development mechanics. Scripted reviewer output is not a live scientific-review qualification, native jobs are process-local, and a code rollback cannot restore stale consumption. Full project adoption, uncertainty recovery, feedback/publication and confirmation require their respective reviewed gates.

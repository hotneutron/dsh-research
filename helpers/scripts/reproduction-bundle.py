"""Create and verify a bounded project-owned team bundle from an explicit byte-pinned declaration."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile
import re
import os


DENIED = {".git", ".autoresearch", "sessions", "private", "node_modules", "__pycache__"}
KINDS = {"source", "released_input", "permitted_evidence", "figure", "brief"}


def safe_path(root, uri):
    if not isinstance(uri, str) or any(char in uri for char in ["\0", "\n", "\r", "\\"]): raise ValueError("Canonical relative release URI required")
    path = PurePosixPath(uri)
    if path.is_absolute() or ".." in path.parts or not path.parts or any(p in DENIED for p in path.parts):
        raise ValueError("Release path crosses a private/state boundary")
    if path.name.startswith(".env") or path.suffix in {".sqlite", ".sqlite3", ".db", ".log", ".jsonl"}:
        raise ValueError("Raw state, Sessions and logs need a separate authorized surface")
    resolved = (root / uri).resolve()
    rel = resolved.relative_to(root)
    if any(p in DENIED for p in rel.parts): raise ValueError("Release symlink targets private/state data")
    if resolved.name.startswith(".env") or resolved.suffix in {".sqlite", ".sqlite3", ".db", ".log", ".jsonl"}:
        raise ValueError("Resolved release target is private/state/Session data")
    return resolved


def bundle(project, declaration, output):
    root = Path(project).resolve()
    declaration = Path(declaration).resolve()
    declaration.relative_to(root / "local_artifacts/autoresearch/dsh")
    if any(part in DENIED for part in declaration.relative_to(root).parts) or declaration.suffix != ".json": raise ValueError("Explicit JSON declaration must stay outside private/state data")
    output = Path(output).resolve()
    output.relative_to(root / "local_artifacts/autoresearch/dsh")
    if output.exists(): raise ValueError("Never overwrite a frozen team bundle")
    spec = json.loads(declaration.read_text())
    if spec.get("schema_version") != 1 or spec.get("kind") != "team_reproduction_bundle" or not spec.get("audience"):
        raise ValueError("Explicit release declaration/audience required")
    files = spec["files"]
    if not files or len(files) > 128: raise ValueError("Bounded nonempty file inventory required")
    if len({entry["uri"] for entry in files}) != len(files): raise ValueError("Duplicate release path")
    checked = []
    # Validate every path/classification/size before reading any candidate file.
    for entry in files:
        if type(entry.get("size_bytes")) is not int or entry["size_bytes"] < 0 or not isinstance(entry.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", entry["sha256"]): raise ValueError("Exact finite byte identity required")
        if entry.get("classification") not in KINDS: raise ValueError("Explicit permitted classification required")
        path = safe_path(root, entry["uri"])
        if not path.is_file() or path.stat().st_size > 64 * 1024 * 1024: raise ValueError("File exceeds bundle scope")
        if path.stat().st_size != entry["size_bytes"]: raise ValueError("Release size changed")
        checked.append((entry, path))
    if sum(entry["size_bytes"] for entry, _ in checked) > 256 * 1024 * 1024: raise ValueError("Bundle exceeds total bound")
    payloads = []
    for entry, path in checked:
        data = path.read_bytes()
        if len(data) != entry["size_bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]: raise ValueError("Released bytes changed")
        payloads.append((entry["uri"], data))
    manifest = {**spec, "publication": "pending", "recipient_access_verified": False,
                "permission_boundary": "The declaration is project-authored; packaging does not certify native audience permissions"}
    encoded = (json.dumps(manifest, sort_keys=True, indent=2) + "\n").encode()
    if any(uri in {"RELEASE.json", "SHA256SUMS"} for uri, _ in payloads): raise ValueError("Reserved bundle member name")
    payloads.append(("RELEASE.json", encoded))
    hashes = {uri: hashlib.sha256(data).hexdigest() for uri, data in payloads}
    payloads.append(("SHA256SUMS", ("".join(f"{hashes[uri]}  {uri}\n" for uri in sorted(hashes))).encode()))
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as stream, tarfile.open(fileobj=stream, mode="w:gz", format=tarfile.PAX_FORMAT) as archive:
        for uri, data in payloads:
            info = tarfile.TarInfo(uri); info.size = len(data); info.mode = 0o600; info.mtime = 0
            archive.addfile(info, io.BytesIO(data))
    with tarfile.open(output) as archive:
        for uri, data in payloads:
            member = archive.getmember(uri)
            if not member.isfile() or archive.extractfile(member).read() != data: raise ValueError("Bundle restoration changed bytes")
    os.chmod(output, 0o600)
    result = {"path": str(output), "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "members": len(payloads),
              "restore_verified": True, "audience": spec["audience"], "recipient_access_verified": False, "publication": "pending"}
    print(json.dumps(result, sort_keys=True))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--declaration", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    bundle(args.project, args.declaration, args.output)

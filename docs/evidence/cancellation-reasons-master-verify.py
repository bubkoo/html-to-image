#!/usr/bin/env python3
"""Verify the portable evidence without extracting or executing its contents."""
from pathlib import Path, PurePosixPath
import hashlib, json, tarfile
folder = Path(__file__).resolve().parent
stem = "cancellation-reasons-master"
index_path = folder / (stem + "-index.json")
summary = json.loads((folder / (stem + ".json")).read_text())
index_bytes = index_path.read_bytes()
assert hashlib.sha256(index_bytes).hexdigest() == summary["index"]["sha256"]
index = json.loads(index_bytes)
archive = folder / index["archive"]["path"]
assert archive.stat().st_size == index["archive"]["bytes"]
assert hashlib.sha256(archive.read_bytes()).hexdigest() == index["archive"]["sha256"]
expected = {entry["path"]: entry for entry in index["files"]}
assert len(expected) == index["fileCount"]
seen = set()
with tarfile.open(archive, "r:gz") as tar:
    for member in tar:
        path = PurePosixPath(member.name)
        assert member.isfile() and not path.is_absolute() and ".." not in path.parts
        assert member.name in expected and member.name not in seen
        data = tar.extractfile(member).read()
        entry = expected[member.name]
        assert len(data) == entry["bytes"]
        assert hashlib.sha256(data).hexdigest() == entry["sha256"]
        seen.add(member.name)
assert seen == set(expected)
print(f"Verified {len(seen)} regular archive files, {index['uncompressedPayloadBytes']} payload bytes; no extraction/execution.")

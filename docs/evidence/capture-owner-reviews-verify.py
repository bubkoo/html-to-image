#!/usr/bin/env python3
"""Verify both independent owner-review archives without extracting files."""
from pathlib import Path, PurePosixPath
import hashlib, json, tarfile
folder = Path(__file__).resolve().parent
for stem in ["svg-fragment-owner-b652", "html-capture-owner-3c0ec09"]:
    summary = json.loads((folder / (stem + ".json")).read_text())
    index_bytes = (folder / summary["index"]["path"]).read_bytes()
    assert hashlib.sha256(index_bytes).hexdigest() == summary["index"]["sha256"]
    index = json.loads(index_bytes)
    archive = folder / index["archive"]["path"]
    assert archive.stat().st_size == index["archive"]["bytes"]
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == index["archive"]["sha256"]
    expected = {x["path"]: x for x in index["files"]}
    seen = set()
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            p = PurePosixPath(member.name)
            assert member.isfile() and not p.is_absolute() and ".." not in p.parts
            assert member.name in expected and member.name not in seen
            b = tar.extractfile(member).read()
            assert len(b) == expected[member.name]["bytes"]
            assert hashlib.sha256(b).hexdigest() == expected[member.name]["sha256"]
            seen.add(member.name)
    assert seen == set(expected) and len(seen) == index["fileCount"]
    print(f"Verified {stem}: {len(seen)} files, {index['payloadBytes']} payload bytes.")

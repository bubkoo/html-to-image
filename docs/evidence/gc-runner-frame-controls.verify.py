#!/usr/bin/env python3
"""Verify this evidence bundle with Python's standard library; no extraction/network/browser."""
from pathlib import Path, PurePosixPath
import gzip
import hashlib
import io
import json
import tarfile

HERE = Path(__file__).resolve().parent
STEM = "gc-runner-frame-controls"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def check(ok, message):
    if not ok:
        raise SystemExit(message)

summary = json.loads((HERE / (STEM + ".json")).read_text())
index_bytes = (HERE / (STEM + "-index.json")).read_bytes()
check(sha(index_bytes) == summary["artifacts"]["index"]["sha256"], "Index SHA mismatch")
index = json.loads(index_bytes)
archive = (HERE / index["archive"]["file"]).read_bytes()
check(len(archive) == index["archive"]["bytes"], "Archive size mismatch")
check(sha(archive) == index["archive"]["sha256"] == summary["artifacts"]["rawArchive"]["sha256"], "Archive SHA mismatch")
check(sha(Path(__file__).read_bytes()) == summary["artifacts"]["portableVerifier"]["sha256"], "Verifier SHA mismatch")
raw = gzip.decompress(archive)  # verifies gzip CRC and trailer as well
expected = {entry["path"]: entry for entry in index["members"]}
check(len(expected) == 43, "Expected exactly 43 distinct members")
contents = {}
with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as tar:
    members = tar.getmembers()
    check(len(members) == len(expected), "Unexpected tar member count")
    for member in members:
        name = PurePosixPath(member.name)
        check(member.isfile() and not name.is_absolute() and ".." not in name.parts, "Unsafe tar member")
        check(member.name in expected and member.name not in contents, "Unknown/duplicate member")
        data = tar.extractfile(member).read()
        entry = expected[member.name]
        check(len(data) == entry["bytes"] and sha(data) == entry["sha256"], "Member mismatch: " + member.name)
        contents[member.name] = data
for group in index["sourceGroups"]:
    prefix = group["archivePrefix"]
    original = contents[prefix + "/sha256-index.json"]
    check(sha(original) == group["originalIndexSHA256"], "Original index mismatch")
    original_index = json.loads(original)
    check(len(original_index["files"]) + 1 == group["fileCount"], "Original group count mismatch")
    for entry in original_index["files"]:
        data = contents[prefix + "/" + entry["file"]]
        check(len(data) == entry["bytes"] and sha(data) == entry["sha256"], "Original source index mismatch")
old = "vitest-provider-frame-fallback-20261125/"
prepared = json.loads(contents[old + "prepared-sha256-index.json"])
for entry in prepared["files"]:
    relative = "initial-import-harness-error/probe.mjs" if entry["file"] == "probe.mjs" else entry["file"]
    data = contents[old + relative]
    check(len(data) == entry["bytes"] and sha(data) == entry["sha256"], "Temporal preparation input mismatch")
for source in summary["candidateSources"]:
    data = contents[source["archivedAt"]]
    check(len(data) == source["bytes"] and sha(data) == source["sha256"], "Candidate source mismatch")
controls = json.loads(contents["gc-runner-frame-controls-20261125/controls.json"])
check(len(controls["cases"]) == 10 and all(case["expectedControlPassed"] for case in controls["cases"]), "Control count/result mismatch")
check(all(case["helperHandles"] == case["helperDisposals"] for case in controls["cases"] if case["variant"] == "candidate"), "Handle disposal mismatch")
print(json.dumps({"verified": True, "members": len(contents), "sourceGroups": 2, "browserLaunched": False}, indent=2))

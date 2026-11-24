"""Read-only verification of the measured GC evidence archives."""
from pathlib import Path
import hashlib
import json
import tarfile

root = Path(__file__).parent
for name in ['master-failure', 'local', 'first-pair', 'expanded-local', 'expanded-pair', 'root-trace-pair-selected', 'no-collection-local', 'checkpoint-runs', 'cc-only-local-selected', 'cc-configuration-pair', 'order-cache-local', 'frozen-order-pair', 'native-controls-local', 'native-controls-linux', 'local-linux-controls', 'recovered-postfailure', 'matched-clone', 'native-operations', 'native-baseline', 'heap-tool-controls', 'heap-resume', 'heap-actual']:
    index = json.loads((root / (name + "-index.json")).read_text())
    archive = root / index["archive"]
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == index["archiveSHA256"]
    expected = {name + "/" + entry["path"] for entry in index["files"]}
    assert len(expected) == len(index["files"])
    with tarfile.open(archive, "r:gz") as measured:
        assert set(measured.getnames()) == expected
        assert len(measured.getmembers()) == len(expected)
        for entry in index["files"]:
            member = measured.getmember(name + "/" + entry["path"])
            assert member.isfile()
            data = measured.extractfile(member).read()
            assert len(data) == entry["bytes"]
            assert hashlib.sha256(data).hexdigest() == entry["sha256"]
    print(name, len(expected), "measured files verified")

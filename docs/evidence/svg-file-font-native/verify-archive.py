from pathlib import Path
import hashlib
import json
import tarfile

root = Path(__file__).parent
index = json.loads((root / 'index.json').read_text())
archive = root / index['archive']
assert hashlib.sha256(archive.read_bytes()).hexdigest() == index['archiveSHA256']
with tarfile.open(archive, 'r:gz') as tar:
    assert len(tar.getmembers()) == len(index['files'])
    assert set(tar.getnames()) == {entry['path'] for entry in index['files']}
    for entry in index['files']:
        member = tar.getmember(entry['path'])
        assert member.isfile()
        data = tar.extractfile(member).read()
        assert len(data) == entry['bytes']
        assert hashlib.sha256(data).hexdigest() == entry['sha256']
print(len(index['files']), 'raw files verified')

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
    assert set(tar.getnames()) == {item['path'] for item in index['files']}
    for item in index['files']:
        member = tar.getmember(item['path'])
        assert member.isfile()
        data = tar.extractfile(member).read()
        assert len(data) == item['bytes']
        assert hashlib.sha256(data).hexdigest() == item['sha256']
print(len(index['files']), 'raw files verified')

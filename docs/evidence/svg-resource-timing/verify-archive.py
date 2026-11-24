from pathlib import Path
import hashlib
import json
import tarfile

root = Path(__file__).parent
index = json.loads((root / 'index.json').read_text())
archive = root / index['archive']
assert hashlib.sha256(archive.read_bytes()).hexdigest() == index['archiveSHA256']
with tarfile.open(archive, 'r:gz') as source:
    assert set(source.getnames()) == {
        'svg-resource-timing/' + entry['path'] for entry in index['files']
    }
    assert len(source.getmembers()) == len(index['files'])
    for entry in index['files']:
        member = source.getmember('svg-resource-timing/' + entry['path'])
        assert member.isfile()
        data = source.extractfile(member).read()
        assert len(data) == entry['bytes']
        assert hashlib.sha256(data).hexdigest() == entry['sha256']
print(len(index['files']), 'native timing files verified')

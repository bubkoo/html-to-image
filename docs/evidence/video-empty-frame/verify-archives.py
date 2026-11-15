from pathlib import Path
import json,hashlib,tarfile
r=Path(__file__).parent
for name in ['before-and-boundaries','candidate-desktop','first-remote','second-remote']:
 d=json.loads((r/(name+'-index.json')).read_text());p=r/d['archive'];assert hashlib.sha256(p.read_bytes()).hexdigest()==d['archiveSHA256']
 with tarfile.open(p,'r:gz') as t:
  assert set(t.getnames())=={name+'/'+f['path'] for f in d['files']}
  assert len(t.getmembers())==len(d['files'])
  for f in d['files']:
   m=t.getmember(name+'/'+f['path']);assert m.isfile();b=t.extractfile(m).read();assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256']
 print(name,len(d['files']),'files verified')

#!/usr/bin/env python3
"""Standard-library-only archive, PNG and recorded-assertion verification; no browser."""
import base64,urllib.parse
import argparse,hashlib,io,json,re,struct,tarfile,zlib
from pathlib import Path,PurePosixPath

def sha(b):return hashlib.sha256(b).hexdigest()
def safe(n):return bool(n) and not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts and '\\' not in n

def png(b):
 assert b[:8]==b'\x89PNG\r\n\x1a\n';offset=8;compressed=b'';width=height=channels=None;ended=False
 while offset<len(b):
  length=struct.unpack('>I',b[offset:offset+4])[0];tag=b[offset+4:offset+8];data=b[offset+8:offset+8+length];crc=struct.unpack('>I',b[offset+8+length:offset+12+length])[0];assert zlib.crc32(tag+data)&0xffffffff==crc
  if tag==b'IHDR':
   width,height,depth,kind,compression,filtering,interlace=struct.unpack('>IIBBBBB',data);assert (width,height)==(40,20) and depth==8 and kind in [2,6] and compression==filtering==interlace==0;channels=3 if kind==2 else 4
  elif tag==b'IDAT':compressed+=data
  elif tag==b'IEND':ended=True;break
  offset+=length+12
 assert ended and channels;raw=zlib.decompress(compressed);stride=width*channels;assert len(raw)==height*(stride+1)
 previous=bytearray(stride);pixels=[]
 def paeth(a,b,c):
  p=a+b-c;d=[abs(p-a),abs(p-b),abs(p-c)];return [a,b,c][d.index(min(d))]
 for y in range(height):
  start=y*(stride+1);method=raw[start];assert method<=4;row=bytearray(raw[start+1:start+stride+1])
  for i in range(stride):
   left=row[i-channels] if i>=channels else 0;up=previous[i];corner=previous[i-channels] if i>=channels else 0
   value=[0,left,up,(left+up)//2,paeth(left,up,corner)][method];row[i]=(row[i]+value)&255
  for i in range(0,stride,channels):pixels.extend(row[i:i+channels]);pixels.extend([255] if channels==3 else [])
  previous=row
 return bytes(pixels)

def originals(files):
 idx=json.loads(files['original/sha256-index.json']);entries=idx['files'];assert {n for n in files if n.startswith('original/')}=={'original/'+x.get('path',x.get('file')) for x in entries}|{'original/sha256-index.json'}
 for item in entries:
  b=files['original/'+item.get('path',item.get('file'))];assert sha(b)==item['sha256'] and len(b)==item['bytes']
 if 'count' in idx:assert len(entries)==idx['count']
 return len(entries),len(entries)+1

def validate(files,kind):
 indexed,count=originals(files);load=lambda name:json.loads(files['original/'+name]);r=load('results.json')
 expected='9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a'
 assert r['allBrowsersClosed'];rows=[]
 if kind=='xml-inherited-csp':
  assert len(r['cases'])==9 and r['guardMs']==2500
  assert sha(files['original/root-9c09.umd.js'])==r['UMDsha256']==expected
  assert {(x['engine'],x['mode']) for x in r['cases']}=={(e,m) for e in ['chromium','firefox','webkit'] for m in ['unrestricted','script-none','different-nonce']}
  for row in r['cases']:
   assert 'error' not in row and row['closed'] and row['closedUTC'] and not row['HTTP']
   assert row['capture']=={'width':40,'height':20,'redPixels':800,'sourceUnchanged':True}
   assert row['cleanup']=={'frames':0,'sourceUnchanged':True}
   pixels=png(files['original/'+row['engine']+'-'+row['mode']+'-current.png']);assert pixels==bytes([255,0,0,255])*800
   if row['mode']=='unrestricted':
    p=row['protocol'];assert p['sourceMatches'] and p['origin']=='null' and not p.get('guardExpired');m=p['message'];assert m['kind']=='xml-ready' and m['contentType']=='image/svg+xml' and m['width']==40 and m['scriptRemoved'];assert not row['consoleErrors']
   else:
    assert row['protocol']=={'guardExpired':True} and row['consoleErrors']
   rows.append({'engine':row['engine'],'mode':row['mode'],'currentAPI800RedPixels':True,'XMLMessageAccepted':bool(row['protocol'].get('message')),'guardExpired':row['protocol'].get('guardExpired',False),'CSPConsoleErrors':len(row['consoleErrors']),'framesAfter':0})
  return {'kind':kind,'status':'inherited-caller-script-policy-blocks-new-nonce-srcdoc-protocol','originalIndexedPayloadFiles':indexed,'originalFilesIncludingIndex':count,'rows':rows,'currentAPIControlPasses':9,'newProtocolPasses':3,'newProtocolBlocked':6,'UMDSHA256':expected,'allBrowsersClosed':True,'productionFix':False,'limits':['Static 40x20 control proves the current API works under these policies; it is not animation-fix validation.','The experimental sampler introduces active scripts into srcdoc. Its meta policy cannot loosen an inherited caller script-src directive.','Only the fixed caller policies and native-XML nonce protocol were tested. No claim about arbitrary CSP, alternate iframe architectures, or all API options.','No phone, network configuration, server, commit, or remote application changes occurred during the probe.']}
 assert kind=='native-xml-resize-ready' and (indexed,count)==(39,40)
 assert len(r['cases'])==8 and sha(files['original/input/root-9c09.umd.js'])==r['sourceUMDSHA256']==expected
 assert sha(files['original/input/callback.svg'])==r['sourceSVGsha256']
 oracle=png(files['original/input/expected-oracle.png']);positive=earlyEmpty=decoded=0
 for row in r['cases']:
  assert 'error' not in row and row['closed'] and not row['HTTP'] and row['hostCleanup']['frames']==0 and row['hostCleanup']['sourceUnchanged']
  events=row['protocol']['events'];terminal=row['protocol'].get('terminal');E=next((e['sample'] for e in events if e['kind']=='E'),None);R=next((e['sample'] for e in events if e['kind']=='R'),None)
  assert all(e.get('sourceMatches') and e.get('origin')=='null' for e in events)
  assert png(files['original/'+row['engine']+'-'+row['label']+'-oracle.png'])==oracle;decoded+=1
  if terminal and terminal['kind']=='result':
   assert R and R['rootCount']>0 and R['targetCount']>0 and R['rootRect']['width']==40 and R['rootRect']['height']==20
   assert row['EtoRDOMUnchanged'] and row['URIsUnchanged'] and E['DOM']==R['DOM'] and E['hrefs']==R['hrefs']==terminal['hrefs']==[]
   assert terminal['observerDisconnected']==1 and terminal['scriptRemoved'] and terminal['pose']['transform']=='matrix(1, 0, 0, 1, 15, 0)'
   assert row['pixels']['differentChannels']==0 and png(files['original/'+row['engine']+'-'+row['label']+'-frozen.png'])==oracle
   decoded+=1;positive+=1
   if E['rootCount']==E['targetCount']==0 and E['rootRect']['width']==E['rootRect']['height']==0:assert row['engine']=='firefox';earlyEmpty+=1
  elif row['label']=='negative-never-attach':
   assert row['protocol']['guardExpired'] and not events and row['hostCleanup']['neverAttached'] and row['hostCleanup']['hostObserverDisconnected']==1 and row['hostCleanup']['hostObserverEntries']==[{'width':0,'height':0}]
  else:
   assert row['engine']=='chromium' and row['protocol']['guardExpired'] and E['rootCount']>0 and E['targetCount']>0 and not R and 'pixels' not in row
  rows.append({'engine':row['engine'],'label':row['label'],'earlyRootStyleCount':E['rootCount'] if E else None,'readyRootStyleCount':R['rootCount'] if R else None,'zeroDifferenceOutput':bool(row.get('pixels',{}).get('differentChannels')==0),'guardExpired':row['protocol'].get('guardExpired',False),'framesAfter':0})
 assert (positive,earlyEmpty,decoded)==(6,4,14)
 return {'kind':kind,'status':'same-document-Firefox-readiness-observed-mandatory-observer-blocks-Chromium','originalIndexedPayloadFiles':indexed,'originalFilesIncludingIndex':count,'rows':rows,'positiveOutputs':positive,'FirefoxEmptyToReadySameDOM':earlyEmpty,'PNGsCRCAndPixelsIndependentlyChecked':decoded+1,'UMDSHA256':expected,'allBrowsersClosed':True,'productionFix':False,'limits':['Observer entry is evidence of native layout readiness, not proof that observing causes readiness.','Chromium already has valid computed styles but never emits an observer entry within the unchanged 2500ms guard. Always awaiting ResizeObserver is not a cross-engine protocol.','Negative control proves host observer disconnect. Chromium child observer cleanup has no acknowledgment; only frame/context/browser teardown is proven.','This callback fixture has no LINK href values. Nonempty resource identity and arbitrary animations are not covered.']}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('archive',type=Path);ap.add_argument('index',type=Path);ap.add_argument('summary',type=Path);a=ap.parse_args();index=json.loads(a.index.read_text());summary=json.loads(a.summary.read_text());raw=a.archive.read_bytes();assert len(raw)==index['archive']['bytes'] and sha(raw)==index['archive']['sha256'] and summary['rawArchive']==index['archive'];files={}
 with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as t:
  ms=t.getmembers();assert len(ms)==index['memberCount'] and len({m.name for m in ms})==len(ms);wanted={x['path']:x for x in index['members']};assert set(wanted)=={m.name for m in ms}
  for m in ms:
   assert safe(m.name) and m.isfile() and m.uid==m.gid==m.mtime==0;b=t.extractfile(m).read();assert len(b)==wanted[m.name]['bytes'] and sha(b)==wanted[m.name]['sha256'];files[m.name]=b
 result=validate(files,summary['kind']);assert summary['verification']==json.loads(files['verification.json'])==result;assert json.loads(files['privacy-scan.json'])['findings']==[];assert files['verify.py']==Path(__file__).read_bytes()
 print(json.dumps({'verified':True,'kind':summary['kind'],'archiveMembers':len(files),'archiveBytes':len(raw),'archiveSHA256':sha(raw)},indent=2))
if __name__=='__main__':main()

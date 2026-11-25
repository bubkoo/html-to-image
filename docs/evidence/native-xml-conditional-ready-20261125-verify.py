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

def validate(files):
 load=lambda n:json.loads(files[n]);r=load('results.json');fixtures=load('input/fixtures.json');modes=['normal','pseudo-data-link-important','uri-identity','onclone-negative-delay'];plan=[[e,m] for e in ['chromium','firefox','webkit'] for m in modes]+[['chromium','negative-never-attach']]
 assert r['plan']==plan and len(r['cases'])==13 and r['allBrowsersClosed'];expected='9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a';assert r['sourceUMDSHA256']==sha(files['input/root-9c09.umd.js'])==expected
 body=files['measurement-template.js'].decode();assert 'requestAnimationFrame' not in body and not re.search(r'\.ready\b|setInterval|setTimeout',body);assert 'Empty computed style cannot be serialized' in files['freeze-body.js'].decode()
 rows=[];Ecount=Rcount=nonempty=0;decoded=set()
 for row,(engine,mode) in zip(r['cases'],plan):
  assert [row['engine'],row['label']]==[engine,mode] and row['closed'] and not row['HTTP'] and not row['errors'];assert row['hostCleanup']['sourceUnchanged'] and row['hostCleanup']['frames']==0
  key=engine+'-'+('onclone-negative-delay' if mode=='negative-never-attach' else mode);f=fixtures[key];assert sha(files['input/'+f['svg']])==row['sourceSVGsha256']==f['sourceSVGsha256']
  events=row['protocol']['events'];assert all(x['sourceMatches'] and x['origin']=='null' for x in events)
  if mode=='negative-never-attach':
   assert row['protocol']['guardExpired'] and not row['protocol'].get('terminal') and not events and row['hostCleanup']['neverAttached'];assert row['hostCleanup']['hostObserverDisconnected']==1 and row['hostCleanup']['hostObserverEntries']==[{'width':0,'height':0}];assert not row.get('pixels') and engine+'-'+mode+'-frozen.svg' not in files;rows.append({'engine':engine,'mode':mode,'result':'expected guard','nativeHostObserverEntry':[0,0],'nativeHostObserverDisconnected':1});continue
  E=next(x['sample'] for x in events if x['kind']=='E');R=next((x['sample'] for x in events if x['kind']=='R'),None);t=row['protocol']['terminal'];assert t['kind']=='result' and t['scriptRemoved'] and row['pixels']['differentChannels']==0 and row['URIsUnchanged']
  valid=lambda s:s['rootCount']>0 and s['targetCount']>0 and s['rootRect']['width']>0 and s['rootRect']['height']>0
  if t['readyStage']=='E':assert valid(E) and not R and t['observerCreated']==t['observerDisconnected']==0 and not any(x['kind']=='observer-armed' for x in events);Ecount+=1
  else:
   assert t['readyStage']=='R' and not valid(E) and R and valid(R) and t['observerCreated']==t['observerDisconnected']==1 and row['EtoRDOMUnchanged'] and E['DOM']==R['DOM'];entries=[x for x in events if x['kind']=='observer-entry'];assert len(entries)==1 and entries[0]['size']['width']>0 and entries[0]['size']['height']>0;Rcount+=1
  assert E['hrefs']==t['hrefs']==f['originalHrefs'];assert not R or R['hrefs']==t['hrefs'];nonempty+=bool(t['hrefs'])
  oraclePath=engine+'-'+mode+'-oracle.png';frozenPath=engine+'-'+mode+'-frozen.png';expectedPath='input/'+f['expected'];oracle=png(files[oraclePath]);assert png(files[frozenPath])==oracle==png(files[expectedPath]);decoded.update([oraclePath,frozenPath,expectedPath]);assert sha(files[engine+'-'+mode+'-frozen.svg'])==row['frozenSVGsha256']
  rows.append({'engine':engine,'mode':mode,'readyStage':t['readyStage'],'EStyles':[E['rootCount'],E['targetCount']],'RStyles':None if R is None else [R['rootCount'],R['targetCount']],'sameDOMBeforeFreeze':True if R else 'E directly sampled','differentChannels':0,'originalURIStringsPreserved':True,'sourceSVGsha256':row['sourceSVGsha256'],'observerCreated':t['observerCreated'],'observerDisconnected':t['observerDisconnected'],'closedUTC':row['closedUTC']})
 assert (Ecount,Rcount,nonempty)==(11,1,6)
 return {'status':'fixed-12-case-protocol-matrix-passed-not-production-validation','positiveCases':12,'negativeNeverAttachCases':1,'directValidE':Ecount,'nativeROAfterInvalidE':Rcount,'nonemptyDataLINKURIControls':nonempty,'independentlyDecodedAndCRCCheckedPNGFiles':len(decoded),'UMDSHA256':expected,'zeroTolerance':True,'guardMs':2500,'allCasesSourceAndHTTPAndCleanupVerified':True,'rows':rows}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('archive',type=Path);ap.add_argument('manifest',type=Path);a=ap.parse_args();m=json.loads(a.manifest.read_text());b=a.archive.read_bytes();assert len(b)==m['bytes'] and sha(b)==m['sha256'];files={}
 with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as tar:
  members=tar.getmembers();assert len(members)==m['members'] and len({x.name for x in members})==len(members)
  for x in members:assert safe(x.name) and x.isfile();files[x.name]=tar.extractfile(x).read()
 idx=json.loads(files['sha256-index.json']);assert {x['path'] for x in idx['files']}==set(files)-{'sha256-index.json'} and idx['count']==len(idx['files'])
 for item in idx['files']:assert len(files[item['path']])==item['bytes'] and sha(files[item['path']])==item['sha256']
 assert validate(files)==json.loads(files['verification.json']);assert files['verify.py']==Path(__file__).read_bytes()
 c=json.loads(files['caller-csp-results.json']);cv=json.loads(files['caller-csp-verification.json']);assert len(c['cases'])==9 and c['guardMs']==2500 and cv['nonceMeasurementCallerCSPBlocked']==6 and c['allBrowsersClosed']
 assert sum(x['capture']['redPixels']==800 and x['capture']['sourceUnchanged'] for x in c['cases'])==9
 assert sum(x['mode']!='unrestricted' and x['protocol'].get('guardExpired') and bool(x['consoleErrors']) for x in c['cases'])==6
 assert sum(x['mode']=='unrestricted' and x['protocol'].get('sourceMatches') and x['protocol']['message']['contentType']=='image/svg+xml' for x in c['cases'])==3
 print(json.dumps({'verified':True,'members':len(files),'bytes':len(b),'sha256':sha(b),'positiveCases':12,'negativeCases':1},indent=2))
if __name__=='__main__':main()

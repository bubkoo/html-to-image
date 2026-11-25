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
 indexed,count=originals(files);load=lambda name:json.loads(files['original/'+name])
 if kind=='xml-phase-diagnostic':
  assert (indexed,count)==(9,10);a=load('results.json');b=load('sync-layout/results.json');rows=[]
  for title,report in [('original-2RAF',a),('new-sync-layout',b)]:
   assert len(report['cases'])==3 and report['cleanup']['serverClosed'] and report['cleanup']['phoneOperations']==0
   assert all(report['cleanup'][e]['browserConnected'] is False for e in ['chromium','firefox','webkit'])
   assert not any(x['path'].startswith('/marker/') for x in report['http'])
   for row in report['cases']:
    phases=[x for x in row['messages'] if x.get('kind')=='phase-diagnostic'];assert phases and all(x['accepted'] and x['sourceMatches'] and x['origin']=='null' for x in phases)
    values=[x['message'] for x in phases];names=[x['name'] for x in values];assert names[:8]==['before-Goodfont','after-Goodfont','before-Badfont','after-Badfont','before-image.decode','after-image.decode','before-load','after-load']
    assert all(x['contentType']=='image/svg+xml' for x in values)
    for x in values[5:]:assert x['goodFontLoaded'] and x['goodFaceCount']==1 and x['badFontRejected'] and x['dataImageWidth']==x['dataImageHeight']==4
    assert not row['serverMarkers'] and not row['attacks'] and row['framesAfter']==0 and row['bodyUnchanged'] and row['focusBefore']==row['focusAfter']
    nav=row['frameNavigated'];owner=[x for x in nav if x['url']=='about:srcdoc'];child=[x for x in nav if x['url'].startswith('data:image/svg+xml')];assert len(owner)==len(child)==1 and child[0]['parentFrameID']==owner[0]['frameID']
    inp=next(x for x in report['inputs'] if x['engine']==row['engine']);parent=next(x for x in row['messages'] if x.get('kind')=='parent-created');assert parent['policy']==inp['policy'] and parent['creationRealm']=='about:srcdoc' and parent['childSandbox']=='allow-scripts'
    if title=='new-sync-layout':
     m=row['message'];assert not row.get('guardExpired') and row['sourceMatches'] and row['origin']=='null';assert m['goodFaces']==['loaded'] and m['badFontRejected'] and m['dataImage']==[4,4] and m['measurementScriptRemoved'] and not m['trustedScriptPresent'] and m['sourceScriptCount']==2;assert names[-2:]==['before-sync-layout','after-sync-layout'];assert 'requestAnimationFrame' not in inp['measurement']
    rows.append({'round':title,'engine':row['engine'],'lastAcceptedPhase':names[-1],'guardExpired':row.get('guardExpired',False),'completeSourceValidatedXMLMessage':bool(row.get('message')),'HTTPMarkerRequests':len(row['serverMarkers']),'attackMessages':len(row['attacks']),'navigationEvents':len(nav)})
  for engine,last in [('chromium','before-rAF2'),('firefox','after-rAF2'),('webkit','before-rAF1')]:assert next(x for x in rows if x['round']=='original-2RAF' and x['engine']==engine)['lastAcceptedPhase']==last
  pairs=[]
  for engine in ['chromium','firefox','webkit']:
   x=next(x for x in a['inputs'] if x['engine']==engine);y=next(x for x in b['inputs'] if x['engine']==engine);assert x['svg']==y['svg'] and sha(x['svg'].encode())==x['sha256']==y['sha256'];assert x['marker']==y['marker'] and x['nonce']!=y['nonce'];assert x['policy'].replace(x['nonce'],'<nonce>')==y['policy'].replace(y['nonce'],'<nonce>');pairs.append({'engine':engine,'sameSourceSVGSHA256':x['sha256'],'freshNonce':True})
  return {'kind':kind,'status':'rAF-unfinished-wait-localized-new-sync-protocol-bounded-controls-complete','originalIndexedPayloadFiles':indexed,'originalFilesIncludingIndex':count,'rows':rows,'sameSourceSVGPairs':pairs,'sourceAndFocusUnchanged':True,'allResourcesClosed':True,'guardMs':2500,'newMeasurementProtocol':True,'oldGuardEvidenceRewritten':False,'oldAnimation49vs7Negated':False,'noLibraryOrNewAnimationCandidateValidation':True,'limits':['Three-engine result applies to this finite hostile fixture, not arbitrary payloads or universal unsafe-behavior absence.','Same previously random marker was intentionally reused for exact source-byte pairing after old contexts closed; nonce remained fresh and source/origin validation remained mandatory.','This round records actual navigation events; previous archives without them remain unchanged.','Owned loopback harness pages were fetched; markerHTTP0 is not a claim that the entire experiment used zero network.']}
 assert kind=='data-css-uri-identity' and (indexed,count)==(23,24)
 r=load('results.json');a=load('assessment.json');inp=load('inputs.json');uris=load('uri-inputs.json');expected='9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a'
 assert sha(files['original/html-to-image.umd.js'])==r['UMDsha256']==a['UMD']['sha256']==inp['UMD']['sha256']==expected
 css=files['original/stylesheet.css'];assert uris['original']!=uris['alternate'] and uris['css'].encode()==css
 assert urllib.parse.unquote_to_bytes(uris['original'].partition(',')[2])==base64.b64decode(uris['alternate'].partition(',')[2],validate=True)==css
 assert r['noManualWaitOrRetry'] and len(r['cases'])==3 and {x['engine'] for x in r['cases']}=={'chromium','firefox','webkit'}
 rows=[]
 for row in r['cases']:
  e=row['engine'];assert 'error' not in row and row['closeResolvedUTC']>=row['closeRequestedUTC'] and not row['httpRequests']
  assert row['prepared']['sameCSSBytes'] and row['prepared']['uriDifferent'] and row['prepared']['animationCount']==1 and row['prepared']['animationStates']==[{'playState':'paused','currentTime':0}]
  assert row['prepared']['href']==row['after']['href']==uris['original'] and row['prepared']['background']==row['after']['background']=='rgb(255, 0, 0)' and row['after']['sourceUnchanged']
  before=files['original/'+e+'-source-before.html'];after=files['original/'+e+'-source-after.html'];assert before==after==row['prepared']['outerHTML'].encode()==row['after']['outerHTML'].encode()
  assert row['hooks']['default']==[] and row['hooks']['reencoded']==[{'before':uris['original'],'after':uris['alternate'],'inlineStyleUnchanged':True}]
  images={name:png(files['original/'+e+'-'+name+'.png']) for name in ['native','default','reencoded']};counts={}
  for name,pixels in images.items():
   red=sum(pixels[i:i+4]==bytes([255,0,0,255]) for i in range(0,len(pixels),4));blue=sum(pixels[i:i+4]==bytes([0,0,255,255]) for i in range(0,len(pixels),4));stats={'red':red,'blue':blue,'other':800-red-blue};assert stats==row['summary'][name];counts[name]=stats;assert [row[name]['width'],row[name]['height']]==[40,20]
  assert counts['native']==counts['default']=={'red':800,'blue':0,'other':0} and counts['reencoded']=={'red':0,'blue':800,'other':0}
  d=lambda left,right:sum(x!=y for x,y in zip(images[left],images[right]));assert d('default','native')==row['summary']['defaultNativeChannels']==0;assert d('reencoded','native')==row['summary']['reencodedNativeChannels']==1600;assert d('default','reencoded')==row['summary']['defaultReencodedChannels']==1600
  rows.append({'engine':e,'nativeRedPixels':800,'defaultRedPixels':800,'reencodedBluePixels':800,'changedChannels':1600,'sourceUnchanged':True,'cloneHrefEdits':1,'recordedHTTPRequestEvents':0,'browserCloseResolvedUTC':row['closeResolvedUTC']})
 return {'kind':kind,'status':'content-equal-data-CSS-reencoding-changes-selector-observed-capture','originalIndexedPayloadFiles':indexed,'originalFilesIncludingIndex':count,'UMDSHA256':expected,'sameDecodedCSSBytes':len(css),'CSSSHA256':sha(css),'PNGsCRCAndPixelsIndependentlyChecked':9,'rows':rows,'isNewAnimationCandidateValidation':False,'isProductionFix':False,'limits':['Pinned original UMD9c09 controlled onCloneNode counterfactual, not the subsequent animation-fix branch.','Equal decoded stylesheet bytes do not preserve literal LINK href identity observed by existing attribute/sibling selectors.','No HTTP(S) request events were recorded; driver also installed abort routes. This is not independent wire-level network accounting or security acceptance.','Source exact outerHTML/computed background remained unchanged. No phone or network setting changes were performed.']}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('archive',type=Path);ap.add_argument('index',type=Path);ap.add_argument('summary',type=Path);a=ap.parse_args();index=json.loads(a.index.read_text());summary=json.loads(a.summary.read_text());raw=a.archive.read_bytes();assert len(raw)==index['archive']['bytes'] and sha(raw)==index['archive']['sha256'] and summary['rawArchive']==index['archive'];files={}
 with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as t:
  ms=t.getmembers();assert len(ms)==index['memberCount'] and len({m.name for m in ms})==len(ms);wanted={x['path']:x for x in index['members']};assert set(wanted)=={m.name for m in ms}
  for m in ms:
   assert safe(m.name) and m.isfile() and m.uid==m.gid==m.mtime==0;b=t.extractfile(m).read();assert len(b)==wanted[m.name]['bytes'] and sha(b)==wanted[m.name]['sha256'];files[m.name]=b
 result=validate(files,summary['kind']);assert summary['verification']==json.loads(files['verification.json'])==result;assert json.loads(files['privacy-scan.json'])['findings']==[];assert files['verify.py']==Path(__file__).read_bytes()
 print(json.dumps({'verified':True,'kind':summary['kind'],'originalIndexedPayloadFiles':result['originalIndexedPayloadFiles'],'originalFilesIncludingIndex':result['originalFilesIncludingIndex'],'archiveMembers':len(files),'archiveBytes':len(raw),'archiveSHA256':sha(raw)},indent=2))
if __name__=='__main__':main()

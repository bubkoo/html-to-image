#!/usr/bin/env python3
"""Standard-library-only archive, PNG and recorded-assertion verification; no browser."""
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

def check_original(files):
 load=lambda n:json.loads(files['original/'+n]);idx=load('sha256-index.json');members=idx['files'];wanted={'original/'+x['path'] for x in members}|{'original/sha256-index.json'};assert {n for n in files if n.startswith('original/')}==wanted
 for x in members:
  b=files['original/'+x['path']];assert len(b)==x['bytes'] and sha(b)==x['sha256']
 if 'count' in idx:assert idx['count']==len(members)
 if 'totalIndexedBytes' in idx:assert idx['totalIndexedBytes']==sum(x['bytes'] for x in members)
 return len(members),len(wanted)

def validate(files,kind):
 indexed,originals=check_original(files);load=lambda n:json.loads(files['original/'+n])
 if kind=='nonce-data-xml':
  assert (indexed,originals)==(13,14);a=load('results.json');b=load('self-remove-variant/results.json');assessment=load('assessment.json')
  find=lambda r,k:next(x for x in r['cases'] if x['engine']=='firefox' and x['kind']==k)
  for report in [a,b]:
   assert report['cleanup']['serverClosed'] and report['cleanup']['phoneOperations']==0
   assert all(report['cleanup'][name]['browserConnected'] is False for name in ['chromium','firefox','webkit'])
   assert not [x for x in report['http'] if x['path'].startswith('/marker/')]
   assert all(x['framesAfter']==0 and not x['attacks'] and x['bodyUnchanged'] and x['focusBefore']==x['focusAfter'] for x in report['cases'])
   security=find(report,'security');assert security['message']['contentType']=='image/svg+xml' and security['sourceMatches'] and security['origin']=='null' and security['message']['goodFaces']==['loaded'] and security['message']['dataImage']==[4,4]
   assert security['message']['badFontRejected']
   for engine in ['chromium','webkit']:assert next(x for x in report['cases'] if x['engine']==engine and x['kind']=='security')['guardExpired']
   assert find(report,'uppercase')['message']['offset']==find(report,'uppercase')['imageOracle'] and not find(report,'uppercase')['message']['uppercaseMatches']
  for k in ['uppercase','script-has','foreign-last-child']:
   x=next(x for x in a['inputs'] if x['engine']=='firefox' and x['kind']==k);y=next(x for x in b['inputs'] if x['engine']=='firefox' and x['kind']==k);assert x['svg']==y['svg'] and x['sha256']==y['sha256']==sha(x['svg'].encode())
  assert find(a,'script-has')['message']['offset']['x']==49 and find(a,'script-has')['imageOracle']['x']==7
  assert find(b,'script-has')['message']['offset']==find(b,'script-has')['imageOracle'] and find(b,'script-has')['imageOracle']['x']==7
  assert find(a,'foreign-last-child')['message']['offset']['x']==7 and find(a,'foreign-last-child')['imageOracle']['x']==31
  assert find(b,'foreign-last-child')['message']['offset']==find(b,'foreign-last-child')['imageOracle']
  animation=find(b,'transient-animation');assert animation['message']['measurementScriptRemoved'] and animation['message']['offset']['x']==49 and animation['imageOracle']['x']==7
  assert find(b,'security')['message']['sourceScriptCount']==2
  assert all(x['message']['measurementScriptRemoved'] and not x['message']['trustedScriptPresent'] for x in b['cases'] if x.get('message'))
  assert len(load('guard-diagnostics.json'))==4 and all(not x['frameNavigationEventsCollected'] for x in load('guard-diagnostics.json'))
  return {'kind':kind,'status':'rejected-as-generic-coordinate-oracle','originalIndexedPayloadFiles':indexed,'originalFilesIncludingTheirIndex':originals,'baseCases':len(a['cases']),'selfRemovalCases':len(b['cases']),'FirefoxSelfRemovalFixesStaticSelectorControls':True,'FirefoxActiveAnimationXMLx':49,'FirefoxActiveAnimationSVGImageX':7,'ChromiumAndWebKitSafetyStatus':'unknown: unchanged2.5s guard, not passed','framenavigatedEvents':'not collected; no inferred committed child URL/contentType','sourceMarkupOrCSSRemoved':False,'currentLibraryOr39InputAcceptance':False,'cleanupVerified':True,'assessmentLimitsPreserved':assessment['security']}
 assert kind=='animation-root-before' and (indexed,originals)==(71,72)
 before=load('inputs-before.json');after=load('inputs-after.json');assert before==after and len(before)==449
 r=load('results.json');a=load('assessment.json');assert r['inputsStable'] and r['inputCount']==449 and r['allBrowsersClosed'] and r['allHarnessCasesCompleted'] and len(r['cases'])==12
 expected='9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a';assert before['dist/html-to-image.js']==r['UMDSHA256']==expected and sha(files['supplemental/dist/html-to-image.js'])==expected
 source=[{'path':p,'sha256':h} for p,h in sorted(before.items()) if p.startswith('src/')];assert len(source)==24 and sha(json.dumps(source,ensure_ascii=False,separators=(',',':')).encode())==r['sourceFingerprint']
 for p,m in a['frozenInputs']['relevantSourceFiles'].items():
  b=files['original/source/'+p];assert sha(b)==before[p]==m['sha256'] and len(b)==m['bytes']
 modes=['css-keyframes-inside','css-keyframes-outside','js-animation','css-paused-negative-delay'];assert {(x['engine'],x['mode']) for x in r['cases']}=={(e,m) for e in ['chromium','firefox','webkit'] for m in modes}
 comparisons=[]
 for row in r['cases']:
  assert row['passedHarness'] and not row['errors'] and row['sourceUnchanged'] and row['sourceBefore']==row['sourceAfter'];s=row['sourceBefore'];assert s['transform']=='matrix(1, 0, 0, 1, 10, 0)' and s['playState']=='paused' and s['progress']==0.5
  assert s['currentTime']==(0 if row['mode']=='css-paused-negative-delay' else 500)
  stem=row['engine']+'-'+row['mode'];oracle=png(files['original/'+stem+'-oracle.png']);assert png(files['original/'+stem+'-native.png'])==oracle
  for name in ['oracle','default','frozen']:
   pixels=png(files['original/'+stem+'-'+name+'.png']);differences=[abs(x-y) for x,y in zip(pixels,oracle)];columns={}
   for y in range(20):
    for x in range(40):
     if pixels[4*(40*y+x):4*(40*y+x)+4]==bytes([255,0,0,255]):columns[str(x)]=columns.get(str(x),0)+1
   stats={'width':40,'height':20,'differentChannels':sum(d!=0 for d in differences),'differentPixels':sum(any(differences[i:i+4]) for i in range(0,len(differences),4)),'maxDelta':max(differences),'redColumns':columns};assert stats==row['outputs'][name]
   expectedDifferent=800 if row['mode']=='css-keyframes-inside' and name!='oracle' else 0;assert stats['differentChannels']==expectedDifferent
  svg=files['original/'+stem+'-capture.svg'];assert sha(svg)==row['outputs']['svgSHA256'] and (b'@keyframes' in svg)==row['outputs']['svgContainsKeyframes']
  assert row['outputs']['defaults']=={'stabilizationAttempts':'default1','width':40,'height':20,'pixelRatio':1,'skipFonts':True}
  comparisons.append({'engine':row['engine'],'mode':row['mode'],'defaultDifferentChannels':row['outputs']['default']['differentChannels'],'frozenDifferentChannels':row['outputs']['frozen']['differentChannels']})
 assert all(x['closed'] for x in r['lifecycles'])
 return {'kind':kind,'status':'current-root-UMD-before-reproduction-confirmed','originalIndexedPayloadFiles':indexed,'originalFilesIncludingTheirIndex':originals,'inputLedgerEntries':449,'sourceFingerprint':r['sourceFingerprint'],'UMDSHA256':expected,'supplementalUMDBytesHashMatchesOriginalRunLedger':True,'sourceSnapshotsVerified':4,'PNGFilesIndependentlyDecodedAndCRCChecked':48,'cases':comparisons,'insideKeyframeOutputsFailing':6,'controlOutputsMatching':18,'sourceStatesBeforeAfterIdentical':True,'stabilizationAttempts':'default1','isFixBranchBeforeAfter':False,'isAfterFixValidation':False,'fixDirectionIsNotImplementedOrValidatedHere':True,'causalLimits':a['causalLimits'],'cleanupVerified':True}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('archive',type=Path);ap.add_argument('index',type=Path);ap.add_argument('summary',type=Path);a=ap.parse_args();index=json.loads(a.index.read_text());summary=json.loads(a.summary.read_text());raw=a.archive.read_bytes();assert sha(raw)==index['archive']['sha256'] and len(raw)==index['archive']['bytes'] and summary['rawArchive']==index['archive'];files={}
 with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as tar:
  members=tar.getmembers();assert len(members)==index['memberCount'] and len({m.name for m in members})==len(members);expected={x['path']:x for x in index['members']};assert set(expected)=={m.name for m in members}
  for m in members:
   assert safe(m.name) and m.isfile() and m.uid==m.gid==m.mtime==0;b=tar.extractfile(m).read();assert len(b)==expected[m.name]['bytes'] and sha(b)==expected[m.name]['sha256'];files[m.name]=b
 result=validate(files,summary['kind']);assert result==json.loads(files['verification.json'])==summary['verification'];assert files['verify.py']==Path(__file__).read_bytes();assert json.loads(files['privacy-scan.json'])['findings']==[]
 print(json.dumps({'verified':True,'kind':summary['kind'],'originalIndexedPayloadFiles':result['originalIndexedPayloadFiles'],'originalFilesIncludingIndex':result['originalFilesIncludingTheirIndex'],'archiveMembers':len(files),'archiveBytes':len(raw),'archiveSHA256':sha(raw)},indent=2))
if __name__=='__main__':main()

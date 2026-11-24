#!/usr/bin/env python3
"""Validate only the twelve explicitly approved public iOS fixture files."""
import argparse,base64,hashlib,html,io,json,re,tarfile,urllib.parse
from pathlib import Path,PurePosixPath
from datetime import datetime
from PIL import Image
NAMES=['bootstrap.txt','cleaned.png','desktop-receipt.json','desktop-verification-summary.json','device-record.json','frozen-inputs-449.json','frozen-manifest.json','frozen-page.html','preview.png','ready.png','returned.png','session-receipt.json']
def sha(b):return hashlib.sha256(b).hexdigest()
def jsjson(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def safe(n):return bool(n) and not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts and '\\' not in n

def validate(files):
 assert set(NAMES)<=set(files)
 data={n:files[n] for n in NAMES};j=lambda n:json.loads(data[n]);m=j('frozen-manifest.json');d=j('device-record.json');ledger=j('frozen-inputs-449.json');s=j('session-receipt.json');desktop=j('desktop-receipt.json');ds=j('desktop-verification-summary.json')
 page=data['frozen-page.html'];text=page.decode();marker=b'<script id="embedded-umd">';start=page.index(marker)+len(marker);umd=page[start:page.index(b'</script>',start)]
 font=base64.b64decode(re.search(r'<script id="embedded-font" type="application/octet-stream">([^<]+)</script>',text).group(1),validate=True)
 embedded=json.loads(re.search(r'<script id="build-manifest" type="application/json">([^<]+)</script>',text).group(1))
 assert sha(page)==m['page']['sha256'] and len(page)==m['page']['bytes']==126151
 assert sha(umd)==m['umd']['sha256']==d['integrity']['umdSHA256']==ledger['dist/html-to-image.js'] and len(umd)==98997==m['umd']['bytes']==d['integrity']['umdBytes']
 assert sha(font)==m['font']['sha256']==d['integrity']['fontSHA256'] and len(font)==1120==m['font']['bytes']==d['integrity']['fontBytes']
 assert d['integrity']['umdMatches'] and d['integrity']['fontMatches']
 assert embedded==d['build']=={k:v for k,v in m.items() if k not in ['page','dataURLCharacters']}
 assert len(ledger)==449 and sha(data['frozen-inputs-449.json'])==m['ledger']['sha256']
 assert sha(jsjson(m['source']))==m['sourceFingerprint']==ds['sourceFingerprint']
 assert len(m['source'])==24 and all(ledger[x['path']]==x['sha256'] for x in m['source'])
 assert ds['page']==m['page'] and desktop['allPassed'] and desktop['cleanup']['desktopBrowsersClosed']
 assert all(row['embeddedUMDSHA256']==sha(umd) and row['passed'] for row in desktop['cases']) and len(desktop['cases'])==3
 assert 'target="_blank" rel="noopener"' in text
 assert "htmlToImage.toBlob(document.getElementById('source'), { width: 160, height: 80, pixelRatio: 1, skipFonts: true, type: 'image/png' })" in text
 assert 'URL.revokeObjectURL(liveURL)' in text and "emit('preview-cleaned'" in text
 c=d['cancellation'];reasons=['null','false','zero','empty string','object','non-stringifiable object','Error']
 assert c['expectedCases']==len(c['cases'])==14 and c['allPassed']
 assert {(r['mode'],r['reason']) for r in c['cases']}=={(mode,reason) for mode in ['preabort','pending onClone barrier'] for reason in reasons}
 for r in c['cases']:
  assert r['passed'] and r['reasonIdentity'] and r['nativeSignalReasonIdentity'] and r['outcome']=='rejected'
  assert (not r['onCloneEntered']) if r['mode']=='preabort' else (r['onCloneEntered'] and r['settledBeforeBarrierRelease'])
 f=d['crossRealmFont'];assert f['passed'] and f['stabilizationAttempts']==3 and f['loadedFaces']==1 and f['loadedFaceStatuses']==['loaded']
 for key in ['sourceHasSVGText','sourceIsCrossRealm','embeddedOriginalFontBytes','sourceDOMUnchanged','sourceFontsUnchanged','sourceFrameRemoved','canvasOwnerIsCaller','callerFontsUnchanged','callerBodyStyleUnchanged','callerSourceMarkupUnchanged','callerFramesRestored']:assert f[key]
 assert f['canvasDimensions']==f['imageDimensions']==[40,20] and f['canvasGreenGlyphPixels']==f['imageGreenGlyphPixels']==256
 p=d['png'];assert p['mime']=='image/png' and p['allPixelsVerified'] and p['decodedBeforePreview'] and (p['width'],p['height'],p['redPixels'],p['bluePixels'])==(160,80,6400,6400)
 assert p['signature']==[137,80,78,71,13,10,26,10] and d['blob']['headerWidth']==160 and d['blob']['headerHeight']==80
 zero={'frames':0,'renderers':0,'snapshots':0,'ownedFrameElements':0};assert d['prechecks']['allPassed'] and d['prechecks']['cleanup']==d['resourceCleanup']==f['cleanup']==zero and d['state']=='cleaned' and d['activeURL'] is None
 events=d['events'];click=next(x for x in events if x['name']=='preview-click');clean=next(x for x in events if x['name']=='preview-cleaned')
 assert click['isTrusted'] and clean['isTrusted'] and click['activation']['isActive'] and clean['activation']['isActive']
 assert click['target']=='_blank' and click['rel']=='noopener' and click['href']==clean['revokedURL'] and click['performanceTime']<clean['performanceTime']
 between=[x for x in events if click['performanceTime']<x['performanceTime']<clean['performanceTime']];assert [x['value'] for x in between if x['name']=='visibility']==['hidden','visible']
 assert [x['result'] for x in events if x['name']=='cancellation-case']==c['cases'];assert next(x['result'] for x in events if x['name']=='cross-realm-font-case')==f
 assert datetime.fromisoformat(s['firstDeviceUseUTC'].replace('Z','+00:00'))>=datetime.fromisoformat(s['userEarliestDeviceUseUTC'].replace('Z','+00:00'))
 bootstrap=data['bootstrap.txt'].decode().strip();url=re.search(r"fetch\('([^']+)'\)",bootstrap).group(1)
 assert url==f"https://raw.githubusercontent.com/bubkoo/html-to-image/{s['fixtureCommit']}/docs/evidence/ios-offline.html" and len(bootstrap)==247
 assert s['runtimeMeasuredCommit']==m['head'] and 'not an exported raw tool transcript' in s['kind'] and 'Long168226-character' in s['initialAttempts']
 assert s['restore']['mirroringWindowsAfterQuit']==0
 screenshots=[]
 for n in ['ready.png','preview.png','returned.png','cleaned.png']:
  b=data[n];im=Image.open(io.BytesIO(b));assert im.format=='PNG';size=list(im.size);im.verify();rgb=Image.open(io.BytesIO(b)).convert('RGB');pixels=list(rgb.getdata());red=sum(r>200 and r>g+100 and r>b+100 for r,g,b in pixels);blue=sum(b>200 and b>r+100 and b>g+100 for r,g,b in pixels);assert red>0 and blue>0
  screenshots.append({'path':n,'bytes':len(b),'sha256':sha(b),'dimensions':size,'containsRedAndBlueFixturePixels':True,'screenshotColorProfile':'ICC-tagged screen capture; dominant-color presence only, not raw PNG equality','scope':'Phone UI screenshot of own fixture, visually reviewed; not the original160x80 PNG bytes or a general screenshot pixel oracle.'})
 return {'schemaVersion':1,'status':'scoped-iPhone-acceptance-passed','environment':d['environment'],'runtimeMeasuredCommit':m['head'],'publicFixtureHostingCommit':s['fixtureCommit'],'frozenPage':m['page'],'umd':m['umd'],'font':m['font'],'inputFingerprint':{'ledgerEntries':449,'ledgerSHA256':sha(data['frozen-inputs-449.json']),'sourceEntries':24,'sourceFingerprint':m['sourceFingerprint'],'manifestAndDeviceAndDesktopMatch':True,'scope':'Independently hashes actual copied HTML/embedded UMD/font and the449-entry ledger; checks24 source hash entries against that ledger. Other449 file contents are not present in this12-file selection and were not reread.'},'cancellation':{'passed':14,'failed':0,'skipped':0,'strictOriginalReasonIdentity':True,'pendingTransformSettledBeforeGateRelease':True},'crossRealmFont':f,'png':p,'interaction':{'click':click,'returnVisibilityEvents':[x for x in between if x['name']=='visibility'],'cleanup':clean,'observedPreview':'Own red/blue PNG visible in preview.png; operator receipt reports actual native target=_blank pointer navigation and Safari Back; returned.png retains preview-clicked state.','anchorTarget':'_blank','anchorRel':'noopener','phoneRuntimeOpenerNullProbeCollected':False},'cleanup':{'state':d['state'],'activeURL':d['activeURL'],'resources':d['resourceCleanup'],'actualRevokeCallRecorded':True,'independentPostRevokeFetchProbeOnPhone':False},'operatorReceipt':{'path':'session-receipt.json','classification':s['kind'],'firstDeviceUseUTC':s['firstDeviceUseUTC'],'earliestAuthorizedUTC':s['userEarliestDeviceUseUTC'],'originalToolTranscriptIncluded':False,'restore':s['restore']},'entry':{'bootstrapURL':url,'bootstrapCharacters':247,'bootstrapHTTPSFetchRequired':True,'zeroNetworkSession':False,'phoneNetworkTraceCollected':False,'initialLongDataURLAttempt':s['initialAttempts']},'screenshots':screenshots,'boundaries':['Font positive control explicitly uses stabilizationAttempts=3. It proves loaded font bytes/realm API/removed-source output only, not GC, native DOM pixel equality or a default first-frame fix.','Red/blue PNG keeps original default stabilization. Device record reports12800 checked pixels; selected screenshots independently show the fixture but do not contain the original PNG file.','Phone cleanup records actual revokeObjectURL invocation and state/resource release. No separate phone post-revoke fetch probe was collected.','A public HTTPS bootstrap is required; total phone HTTP accounting was not collected. Desktop HTTP0 cannot be transferred to this phone session.','session-receipt.json is a root operator receipt, not an exported raw tool log. Initial long address input failure remains recorded.','This is scoped UMD public API/manual Blob-preview acceptance, not the full iOS source suite, ESM package matrix, GC or native-pixel acceptance.'],'archiveOperations':{'approvedOriginalFilesRead':12,'privatePhoneDirectoriesTraversed':False,'browserOrPhoneOperations':0,'networkOperations':0}}

def privacy(files):
 findings=[]
 for name,b in files.items():
  try:s=b.decode()
  except UnicodeDecodeError:continue
  for text in [s,html.unescape(s).replace('\\/','/')]:
   for url in re.findall(r'https?://[^\s<>"\x1b]+',text):
    try:u=urllib.parse.urlsplit(url);keys=urllib.parse.parse_qs(u.query)
    except ValueError:continue
    if any(k.lower() in ['sig','signature','token','access_token','x-amz-signature','x-goog-signature','se','sp','sv'] for k in keys):findings.append({'path':name,'kind':'signed-or-credential-URL'})
   for pat in [r'gh[pousr]_[A-Za-z0-9_]{20,}',r'github_pat_[A-Za-z0-9_]{20,}',r'AKIA[0-9A-Z]{16}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']:
    if re.search(pat,text):findings.append({'path':name,'kind':'credential-pattern'})
 assert not findings,findings
 return {'findings':findings,'screenshotVisualReview':'Four supplied PNGs show only the owned red/blue fixture, its controls/diagnostic and normal Safari/status chrome. No user page, favorites or all-tabs screenshots.','scope':'Only the12 explicitly approved originals were read. Text scanned for credential/signed-URL patterns; no claim to detect arbitrary secrets. No private folder traversal.'}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--source',type=Path);ap.add_argument('--archive',type=Path);ap.add_argument('--index',type=Path);ap.add_argument('--summary',type=Path);a=ap.parse_args()
 if a.source:
  assert sorted(f.name for f in a.source.iterdir())==sorted(NAMES)
  files={n:(a.source/n).read_bytes() for n in NAMES};result=validate(files);privacy(files);print(json.dumps(result,ensure_ascii=False,indent=2));return
 assert a.archive and a.index and a.summary
 index=json.loads(a.index.read_text());summary=json.loads(a.summary.read_text());b=a.archive.read_bytes();assert len(b)==index['archive']['bytes'] and sha(b)==index['archive']['sha256']
 with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as t:
  members=t.getmembers();assert len(members)==index['memberCount'] and len({m.name for m in members})==len(members);files={}
  wanted={x['path']:x for x in index['members']};assert set(wanted)=={m.name for m in members}
  for m in members:
   assert safe(m.name) and m.isfile();data=t.extractfile(m).read();assert len(data)==wanted[m.name]['bytes'] and sha(data)==wanted[m.name]['sha256'];files[m.name]=data
 result=validate(files);assert json.loads(files['verification.json'])==result and summary['acceptance']==result;privacy({n:files[n] for n in NAMES})
 assert json.loads(files['privacy-scan.json'])['findings']==[]
 assert files['verify.py']==Path(__file__).read_bytes()
 print(json.dumps({'verified':True,'originalFiles':12,'archiveMembers':len(files),'archiveBytes':len(b),'archiveSHA256':sha(b)},indent=2))
if __name__=='__main__':main()

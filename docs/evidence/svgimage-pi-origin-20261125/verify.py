#!/usr/bin/env python3
"""Offline stdlib verifier; never starts a browser/network or executes archive code.
Usage: python3 verify.py [directory-containing-summary-index-raw]
"""
import ast
import binascii
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct
import sys
import tarfile
from urllib.parse import unquote
import xml.etree.ElementTree as ET
import zlib

ENGINES={'chromium','firefox','webkit'}
CURRENT='9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a'
HISTORICAL='40b6a68fa1590b7b25be0b5ce0d4236f0ae32f97b611a366ee15a3cfb3af1d15'
SVG='http://www.w3.org/2000/svg'


def require(value,message):
    if not value:raise AssertionError(message)


def sha(data):return hashlib.sha256(data).hexdigest()


def png(data):
    require(data[:8]==b'\x89PNG\r\n\x1a\n','PNG signature')
    pos=8;compressed=bytearray();chunks=[];header=None
    while pos<len(data):
        require(pos+12<=len(data),'PNG truncated chunk')
        size=struct.unpack_from('>I',data,pos)[0];tag=data[pos+4:pos+8];body=data[pos+8:pos+8+size]
        require(pos+12+size<=len(data)and len(body)==size,'PNG truncated body')
        crc=struct.unpack_from('>I',data,pos+8+size)[0]
        require(binascii.crc32(tag+body)&0xffffffff==crc,'PNG CRC')
        chunks.append(tag.decode('ascii'))
        if tag==b'IHDR':header=struct.unpack('>IIBBBBB',body)
        if tag==b'IDAT':compressed.extend(body)
        pos+=size+12
        if tag==b'IEND':break
    require(header is not None and pos==len(data)and chunks[0]=='IHDR'and chunks[-1]=='IEND','PNG structure')
    width,height,depth,color,comp,filt,interlace=header
    require(depth==8 and color in(2,6)and(comp,filt,interlace)==(0,0,0),'Only actualRGB8/RGBA8 noninterlaced PNGs supported')
    bpp=3 if color==2 else 4;stride=width*bpp;raw=zlib.decompress(compressed)
    require(len(raw)==height*(stride+1),'PNG row length')
    previous=bytearray(stride);rgba=bytearray();cursor=0
    for _ in range(height):
        kind=raw[cursor];cursor+=1;row=bytearray(raw[cursor:cursor+stride]);cursor+=stride
        require(kind in range(5),'PNG filter')
        for i in range(stride):
            left=row[i-bpp]if i>=bpp else 0;up=previous[i];upper_left=previous[i-bpp]if i>=bpp else 0
            if kind==0:p=0
            elif kind==1:p=left
            elif kind==2:p=up
            elif kind==3:p=(left+up)//2
            else:
                q=left+up-upper_left;a,b,c=abs(q-left),abs(q-up),abs(q-upper_left)
                p=left if a<=b and a<=c else up if b<=c else upper_left
            row[i]=(row[i]+p)&255
        if bpp==4:rgba.extend(row)
        else:
            for i in range(0,len(row),3):rgba.extend(row[i:i+3]);rgba.append(255)
        previous=row
    return width,height,bytes(rgba),chunks


class Evidence:
    def __init__(self,payload):self.payload=payload;self.decoded={}
    def read(self,group,name):return self.payload['raw/'+group+'/'+name]
    def json(self,group,name='results.json'):return json.loads(self.read(group,name))
    def image(self,group,name):
        path='raw/'+group+'/'+name
        if path not in self.decoded:self.decoded[path]=png(self.payload[path])
        return self.decoded[path]


class VirtualFile:
    def __init__(self,payload,path):self.payload=payload;self.path=path
    def read_bytes(self):return self.payload[self.path]
    def read_text(self):return self.read_bytes().decode()


class VirtualFolder:
    def __init__(self,payload,path):self.payload=payload;self.path=path
    def __truediv__(self,name):return VirtualFile(self.payload,self.path+'/'+name)


def diff(a,b):
    require(len(a)==len(b),'RGBA lengths differ')
    return sum(x!=y for x,y in zip(a,b))


def uniform(e,group,name,expected,size):
    w,h,p,_=e.image(group,name);require((w,h)==size,'PNG dimensions '+name)
    require(p==bytes(expected)*(w*h),'PNG exact color '+name)


def marker_pixels(black,white):
    w,h,a,_=black;w2,h2,b,_=white;require((w,h)==(w2,h2)==(224,144),'Marker raster dimensions')
    mask=set();changed=0;other=0
    for pixel in range(w*h):
        i=pixel*4;x=a[i:i+4];y=b[i:i+4]
        if x!=y:
            changed+=1
            if x==b'\0\0\0\xff'and y==b'\xff\xff\xff\xff':mask.add(pixel)
            else:other+=1
    bbox=None;complete=False
    if mask:
        xs=[x%w for x in mask];ys=[x//w for x in mask];x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
        bbox={'x':x0,'y':y0,'width':x1-x0+1,'height':y1-y0+1}
        perimeter={y*w+x for y in range(y0,y1+1)for x in range(x0,x1+1)if x in(x0,x1)or y in(y0,y1)}
        complete=mask==perimeter
    return bbox,complete,len(mask),changed,other


def xml_parts(text):
    root=ET.fromstring(text);fo=root.find('{'+SVG+'}foreignObject')
    require(fo is not None and len(fo)>0,'MissingFO/root')
    return root,fo,fo[0]


def check_marker_row(e,group,row):
    name=row['engine']+'-'+row['mode'];original=e.read(group,name+'-original.svg');expanded=e.read(group,name+'-expanded.svg')
    a,fo,source=xml_parts(original);b,fo2,copy=xml_parts(expanded)
    require(ET.tostring(source)==ET.tostring(copy),'Root subtree changed '+name)
    require(b.attrib=={**a.attrib,'width':'224','height':'144','viewBox':'0 0 224 144'},'ExpandedSVG attributes '+name)
    require(fo2.attrib=={**fo.attrib,'width':'160','height':'80','overflow':'visible'},'ExpandedFO attributes '+name)
    # Restore only the declared wrapper attributes; all remaining DOM must match.
    b.attrib.clear();b.attrib.update(a.attrib);fo2.attrib.clear();fo2.attrib.update(fo.attrib)
    require(ET.tostring(a)==ET.tostring(b),'Unexpected measurementDOM mutation '+name)
    for color in('black','white'):
        svg=e.read(group,name+'-'+color+'.svg');require(svg.endswith(expanded),'PI not prefix-only '+name)
        prefix=svg[:-len(expanded)].decode();m=re.fullmatch(r'<\?xml-stylesheet type="text/css" href="data:text/css,([^"]*)"\?>',prefix)
        require(m is not None,'PI syntax '+name)
        expected='@layer pi_marker{:root > foreignObject > :first-child{outline:1px solid '+color+'!important;outline-offset:-1px!important}}'
        require(unquote(m.group(1))==expected,'PI rule changed '+name)
    o1=row['oracle']['original'];o2=row['oracle']['expanded']
    layout=o1['rootRelativeFO']==o2['rootRelativeFO']and o1['children']==o2['children']and o1['subtree']==o2['subtree']
    require(layout and row['wrapperPreservesLayout'],'NativeXML wrapper changed layout '+name)
    require(o1['contentType']==o2['contentType']=='image/svg+xml','Not nativeXML oracle '+name)
    require(o1['scripts']==o2['scripts']==o1['iframes']==o2['iframes']==0,'Oracleunexpected active elements')
    require(row['rootSubtreeUnchanged']and row['DOMBefore']==row['DOMAfter'],'Root attrs/elements/URI mismatch '+name)
    require(sha(row['DOMBefore']['subtree'].encode())==row['rootDOMSHA256'],'Root serializedSHA '+name)
    bbox,complete,count,changed,other=marker_pixels(e.image(group,name+'-black.png'),e.image(group,name+'-white.png'))
    marker=row['marker'];target=o1['rootRelativeFO']
    require(marker['observedBBox']==bbox and marker['fullPerimeter']==complete,'Marker raw bounds/perimeter '+name)
    require(marker['visibleMarkerPixels']==count and marker['differentPixels']==changed and marker['nonMarkerDifferences']==other,'Marker raw pixels '+name)
    known=layout and complete and other==0 and bbox['width']==target['width']and bbox['height']==target['height']
    require(marker['status']==('known'if known else'unknown'),'Known gate '+name)
    if known:
        require(marker['coordinate']==bbox==target and row['markerMatchesOracle'],'Coordinate/oracle '+name)
    else:require(marker['coordinate']is None and row['markerMatchesOracle']is None,'Unknown must be null '+name)
    require(not row.get('error')and not row['http'],'Case error/HTTP '+name)
    return known


def check_publication(e):
    output={}
    # Primitive PI capability9.
    group='pi-style';j=e.json(group)
    require(len(j['cases'])==9 and {(r['engine'],r['mode'])for r in j['cases']}=={(x,y)for x in ENGINES for y in'ABC'},'PIstyle9 identities')
    for r in j['cases']:
        expected=[255,0,0,255]if r['mode']=='A'else[0,0,255,255]
        uniform(e,group,r['engine']+'-'+r['mode']+'.png',expected,(8,8))
        require(r['image']['decoded']and not r['http']and r['image']['framesAfter']==0,'PIstyle readiness/HTTP')
    require(j['allBrowsersClosed'],'PIstyle cleanup');output['PIStyle']=9
    # Caller CSP18, not an iframe inheritance theorem.
    group='caller-csp';j=e.json(group)
    require(len(j['cases'])==18 and {(r['engine'],r['policyName'],r['mode'])for r in j['cases']}=={(x,y,z)for x in ENGINES for y in('inlineOnly','scriptNone','nonceOther')for z in('inline','PI')},'CSP18 identities')
    for r in j['cases']:
        name=r['engine']+'-'+r['policyName']+'-'+r['mode'];uniform(e,group,name+'.png',[0,0,255,255],(8,8))
        require(r['image']['callerPolicyMeta']==r['policy']==j['plan']['callerPolicies'][r['policyName']],'Caller policy')
        require(not r['http']and not r['console']and not r['image']['violations']and r['image']['decoded'],'CSP records')
        baseline='chromium-'+('B'if r['mode']=='inline'else'C')+'.svg'
        require(e.read(group,name+'.svg')==e.read('pi-style',baseline),'CSP SVG bytes changed')
    require(j['allBrowsersClosed'],'CSP cleanup');output['callerCSP']=18
    # Historical15 actual40b6; erroneous prose labels remain unedited.
    group='historical-marker-40b6';j=e.json(group)
    require(j['umdSHA256']==HISTORICAL and len(j['cases'])==15,'Historical identity')
    require(any('9c09'in r.get('inputOrigin','')for r in j['cases']),'Original historical mislabel missing')
    old_known=sum(check_marker_row(e,group,r)for r in j['cases'])
    require(old_known==9,'Historical9known/6unknown');require(all(x['closed']for x in j['cleanup'].values()),'Historicalcleanup')
    require(sha(e.payload['raw/provenance/historical-40b6.umd.js'])==HISTORICAL,'Historical UMD bytes')
    require(json.loads(e.payload['raw/provenance/historical-root-margin-results.json'])['umd']['sha256']==HISTORICAL,'Historical original baseline')
    historical_scope=json.loads(e.payload['raw/provenance/historical-scope.json'])['runtime']
    require(historical_scope['pinnedUMD']==HISTORICAL and historical_scope['source']=='e014fefb5928e5a85b8ba2af3f32a4c082713346'and historical_scope['notCurrentCancellationBuild']is True,'Historical canonical source boundary')
    output['historicalMarker']={'actualUMD':HISTORICAL,'known':9,'unknown':6}
    # Fresh actual9c09 core39+6; fresh native/normalized independent pixel check.
    group='current-origin-9c09';j=e.json(group);core=[r for r in j['cases']if not r['negative']];negative=[r for r in j['cases']if r['negative']]
    modes={'zero-margin','margin-top16','margin-left16','margin-top-left16','margin-auto-horizontal','margin-auto-flex','margin-left-percentage','margin-top-percentage','collapse-through-parent','collapsed-child-zero-root-margin','collapsed-child-root-margin16','contained-child-margin-control','negative-margin-control'}
    require(len(core)==39 and {(r['engine'],r['mode'])for r in core}=={(x,y)for x in ENGINES for y in modes},'Core39 identities')
    require(len(negative)==6 and {(r['engine'],r['mode'])for r in negative}=={(x,y)for x in ENGINES for y in('negative-final-outline-important','negative-clip-opacity')},'Extra6 identities')
    require(j['umdSHA256']==CURRENT==sha(e.read(group,'current-root-9c09.umd.js')),'Current9c09 runtime')
    before=e.json(group,'fixture-and-source-identity-before.json');after=e.json(group,'fixture-and-source-identity-after.json')
    require(before['rootSourceSHA256']==after['rootSourceSHA256']and before['rootBundleSHA256']==after['rootBundleSHA256']==CURRENT,'Current source seal')
    fixture=e.read(group,'source-fixture.mjs').decode();case_text,builder=fixture.split('\nexport const buildSource = ',1)
    require(sha(case_text.replace('export const cases =','const cases =',1).encode())==before['originalCaseArraySHA256'],'Original13case array not preserved')
    require(sha(builder[:-1].encode())==before['originalSourceBuilderSHA256'],'Original source builder not preserved')
    counts=Counter()
    for r in j['cases']:
        name=r['engine']+'-'+r['mode'];known=check_marker_row(e,group,r)
        require(r['baseline']['before']==r['baseline']['after']and r['sourceUnchanged'],'Fresh source mutation')
        w,h,native,_=e.image(group,name+'-native.png');w2,h2,capture,_=e.image(group,name+'-captured.png')
        require((w,h)==(w2,h2)==(160,80),'Fresh baseline dimensions')
        require(diff(native,capture)==r['baseline']['differentChannels'],'Actual current/native baseline diff')
        if known:
            require(not r['negative'],'Negative falsely known')
            w3,h3,normalized,_=e.image(group,name+'-normalized.png')
            require((w3,h3)==(160,80)and diff(native,normalized)==r['normalized']['differentChannels']==0,'Normalized not exactnative')
            require(r['normalized']['rootDOMURIsElementsUnchanged'],'Normalized root mutation')
            a,fo,source=xml_parts(e.read(group,name+'-original.svg'));b,fo2,copy=xml_parts(e.read(group,name+'-normalized.svg'))
            require(a.attrib==b.attrib and ET.tostring(source)==ET.tostring(copy),'Normalized DOM root change')
            require(float(fo2.get('x'))==-r['marker']['coordinate']['x']and float(fo2.get('y'))==-r['marker']['coordinate']['y']and fo2.get('overflow')=='visible','Normalized origin')
            fo2.attrib.clear();fo2.attrib.update(fo.attrib)
            require(ET.tostring(a)==ET.tostring(b),'Normalization changed more thanFO')
            counts['knownExact']+=1
        else:
            require('normalized'not in r,'Unknown got normalized fallback')
            require('raw/'+group+'/'+name+'-normalized.svg'not in e.payload and 'raw/'+group+'/'+name+'-normalized.png'not in e.payload,'Unknown output exists')
            if r['negative']:counts['extraUnknown']+=1
            else:
                require(r['mode']=='negative-margin-control'and r['expectedCoordinate']['x']==r['expectedCoordinate']['y']==-8,'Unexpected coreunknown')
                counts['coreUnknown']+=1
    require(counts=={'knownExact':36,'extraUnknown':6,'coreUnknown':3},'Current36/3/6')
    require(all(x['closed']for x in j['cleanup'].values()),'Current cleanup')
    output['currentMarker']=dict(counts)
    # Exact margin-trim value only; unsupported retains original bytes.
    group='margin-trim-exact';j=e.json(group);require(len(j['cases'])==9,'Trim9')
    require(all(not x['marginTrim']for x in j['engines'].values()),'Exact trim support unexpectedly claimed')
    require(all(j['engines'][x]['none']and j['engines'][x]['propertyPresent']for x in('chromium','webkit')),'Trim partial capability lost')
    require(not j['engines']['firefox']['none']and not j['engines']['firefox']['propertyPresent'],'FF trim boundary')
    expected={'margin-top-left16':9216,'collapsed-child-zero-root-margin':15360,'negative-margin-control':4864}
    require({(r['engine'],r['mode'])for r in j['cases']}=={(x,y)for x in ENGINES for y in expected},'Trim identities')
    for r in j['cases']:
        name=r['engine']+'-'+r['mode'];require(e.read(group,name+'-original.svg')==e.read(group,name+'-candidate.svg'),'Unsupported trim changedSVG')
        _,_,n,_=e.image(group,name+'-native.png');_,_,a,_=e.image(group,name+'-captured.png');_,_,b,_=e.image(group,name+'-candidate.png')
        require(diff(a,b)==0 and diff(n,a)==diff(n,b)==expected[r['mode']],'Trim pixel boundary')
        require(r['output']['originalRootAttrsTransformURIsElementsUnchanged']and not r['http'],'Trim invariant')
    require(all(x['closed']for x in j['cleanup'].values()),'Trimcleanup');output['marginTrimExact']=9
    # Finite resource/security witness checks; HTTP0 alone is never readiness.
    security=derive_security(VirtualFolder(e.payload,'raw/resource-security'))
    require(security==e.json('resource-security','assessment.json')['independentChecks'],'Resource independent derivation changed')
    output['resourceSecurity']={key:security[key]for key in('fixedImageCases','PIStylePositives','sourceTrapRequests','serverWitnessRequests','allowedHostImageRequests','strictHostImageRequests','serverJournalTotal')}
    # Static API contract only. No compatibility browser test is inferred.
    api=json.loads(e.payload['raw/provenance/api-contract.json'])
    require(api['commit']=='2f5b369e376fd462034ee8349125fea9724b61b7','API contract commit')
    for r in api['files']:
        b=e.payload[r['path']];require(sha(b)==r['sha256']and len(b)==r['bytes'],'API contract blob '+r['path'])
    capture=e.payload['raw/api-contract/src/capture.ts'].decode();docs=e.payload['raw/api-contract/docs/v2-architecture.md'].decode();tests=e.payload['raw/api-contract/test/spec/renderer.test.ts'].decode()
    require('toSvg: () => task.run(async () => svg!)'in capture and 'let raster: Promise<HTMLCanvasElement> | undefined'in capture,'Pure/lazy source')
    require('const attempts = options.stabilizationAttempts ?? 1'in capture and'for (let attempt = 0; attempt < attempts; attempt += 1)'in capture,'Attempt source')
    require('first raster output is lazy'in docs and'capture.toSvg()'in docs,'Architecture docs')
    require('expect(draws).toBe(3)'in tests and'renders once for concurrent formats'in tests,'Existing renderer contract')
    require('MIT License'in e.payload['raw/api-contract/LICENSE'].decode(),'Repository license missing')
    output['apiContract']={'commit':api['commit'],'staticOnly':True,'newCompatibilityBrowserTests':False}
    return output


# Frozen finite-security check logic, copied as verifier source at seal time; archivecode is never executed.
class HTMLChecks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.starts=[]
        self.ends=[]
    def handle_starttag(self, tag, attrs):
        self.starts.append((tag,dict(attrs)))
    def handle_endtag(self, tag):
        self.ends.append(tag)

def derive_security(folder):
    report=json.loads((folder/'results.json').read_text())
    plan=json.loads((folder/'plan.json').read_text())
    assert len(report['pairs'])==6 and sum(len(r['modeResults'])for r in report['pairs'])==12
    assert report['cleanup']['serverClosed']
    assert all(report['cleanup'][e]['browserClosed']for e in ['chromium','firefox','webkit'])
    ns={'svg':'http://www.w3.org/2000/svg','html':'http://www.w3.org/1999/xhtml'}
    css=plan['PIcss'];prefix='<?xml-stylesheet type="text/css" href="data:text/css,'
    pairs=[]
    for row in report['pairs']:
        identity=row['id'];assert 'error'not in row and row['contextClosed']
        assert row['headerMatches'] and row['callerBefore']==row['callerAfter']
        assert row['callerAfter']['frames']==0 and row['callerUnchanged']
        original=(folder/(identity+'-original.svg')).read_bytes()
        candidate=(folder/(identity+'-PI.svg')).read_bytes()
        blob=(folder/(identity+'-blob.html')).read_bytes()
        assert sha(original)==row['originalSHA256'] and sha(candidate)==row['candidateSHA256']
        assert candidate.endswith(original) and candidate[:-len(original)].decode().startswith(prefix)
        pi=candidate[:-len(original)].decode();assert pi.endswith('"?>')
        assert unquote(pi[len(prefix):-3])==css and sha(css.encode())==row['PIcssSHA256']
        assert row['PIOnlyChange'] and sha(blob)==row['blobHTMLSHA256']
        assert row['blob']['before']['ok']and row['blob']['before']['body'].encode()==blob
        assert row['blob']['beforeBytesMatch']and row['blob']['afterFetchRejected']
        assert row['blob']['after']['revokeCalled']and not row['blob']['after']['fetchResolved']
        assert row['blob']['created']==row['blob']['revoked']==1
        root=ET.fromstring(original)
        assert root.tag=='{'+ns['svg']+'}svg'and root.attrib['onload']
        root_style=root.find('svg:style',ns).text
        assert '@import' in root_style and '@font-face' in root_style and '/trap/font.ttf'in root_style
        assert len(root.findall('svg:image',ns))==2
        assert len(root.findall('svg:script',ns))==2
        assert len(root.findall('.//html:script',ns))==2
        assert len(root.findall('.//html:iframe',ns))==2 and len(root.findall('.//html:object',ns))==2
        assert sum(e.attrib.get('src')==row['blob']['url']for e in root.findall('.//html:iframe',ns))==1
        assert sum(e.attrib.get('data')==row['blob']['url']for e in root.findall('.//html:object',ns))==1
        h=HTMLChecks();h.feed(blob.decode());assert sum(t=='script'for t,a in h.starts)==h.ends.count('script')==2
        assert row['serverWitness']=={'status':200,'body':'owned-server-witness'}
        witnesses=[j for j in report['serverJournal']if j['path'].startswith('/case/'+identity+'/witness/')]
        assert any(j['path'].endswith('/server')for j in witnesses)
        image_receipts=[j for j in witnesses if j['path'].endswith('/host-image.png')]
        if row['policy']=='unrestricted':
            assert row['hostImageWitness']['decoded']and len(image_receipts)==1
            assert 'content-security-policy'not in row['actualHeaders']
        else:
            assert row['policy']=='strictHTTPheader'and not row['hostImageWitness']['decoded']and image_receipts==[]
            assert row['actualHeaders']['content-security-policy']==report['policies']['strictHTTPheader']
            assert any(v['directive']=='img-src'and v['blockedURI'].endswith('/witness/host-image.png')for v in row['violations'])
        traps=[j for j in report['serverJournal']if j['path'].startswith('/case/'+identity+'/trap/')]
        assert traps==row['sourceTrapReceipts']==[]
        images=[];pixels=[]
        for mode in row['modeResults']:
            image=mode['image'];assert image['decoded']and image['loaded']and image['positiveReady']
            assert image['positiveGreen']==image['positiveDataBlue']==64
            assert image['width']==image['height']==64 and image['elapsedMS']<2500
            assert any(x['event']=='load'for x in image['events'])
            assert mode['imageCleanup']=={'srcAbsent':True,'settled':True,'timerCleared':True,'listenersRemoved':True}
            width,height,rgba,chunks=png((folder/(identity+'-'+mode['mode']+'.png')).read_bytes())
            assert width==height==64
            def count_rect(x0,y0,width,height,color):
                return sum(rgba[(y*64+x)*4:(y*64+x)*4+4]==bytes(color)for y in range(y0,y0+height)for x in range(x0,x0+width))
            assert count_rect(0,0,8,8,[0,128,0,255])==count_rect(8,0,8,8,[0,0,255,255])==64
            white=sum(rgba[(y*64+x)*4:(y*64+x)*4+4]==b'\xff\xff\xff\xff'for y in range(16,48)for x in range(16,48)if x in [16,47]or y in [16,47])
            expected=0 if mode['mode']=='nativeSVGImage' else 124
            assert white==expected==image['whiteOutlinePixels']
            if expected:assert image['PIStylePositive']
            pixels.append(rgba);images.append({'mode':mode['mode'],'greenPixels':64,'dataBluePixels':64,'whiteOutlinePixels':white,'decodedAndLoaded':True,'PNGChunks':chunks})
        changed=sum(pixels[0][i:i+4]!=pixels[1][i:i+4]for i in range(0,len(pixels[0]),4))
        assert changed==124
        pairs.append({'engine':row['engine'],'version':row['version'],'policy':row['policy'],
                      'originalSHA256':sha(original),'candidateSHA256':sha(candidate),'BlobHTMLSHA256':sha(blob),
                      'PIOnlyByteAddition':True,'sourceTrapRequests':0,'serverWitnessRequests':1,
                      'hostHTTPImageRequests':len(image_receipts),'hostPolicyWitnessMatches':True,
                      'revokeAfterFetchRejected':True,'callerFramesAfter':0,'callerBodyFontsFramesUnchanged':True,
                      'contextClosed':True,'images':images,'PIOnlyChangedPixels':changed})
    assert len(report['serverJournal'])==15
    assert sum('/witness/server'in j['path']for j in report['serverJournal'])==6
    assert sum('/witness/host-image.png'in j['path']for j in report['serverJournal'])==3
    assert not any('/trap/'in j['path']for j in report['serverJournal'])
    return {'pairs':pairs,'fixedImageCases':12,'PIStylePositives':6,'sourceTrapRequests':0,
            'serverWitnessRequests':6,'allowedHostImageRequests':3,'strictHostImageRequests':0,
            'serverJournalTotal':15,'cleanup':report['cleanup']}


def main():
    directory=Path(sys.argv[1])if len(sys.argv)>1 else Path(__file__).resolve().parent
    index=json.loads((directory/'index.json').read_text());summary=json.loads((directory/'summary.json').read_text())
    archive=directory/'raw.tar.gz';require(archive.stat().st_size==index['archive']['bytes']and sha(archive.read_bytes())==index['archive']['sha256'],'Archive SHA/size')
    for r in index['companionFiles']:
        b=(directory/r['path']).read_bytes();require(sha(b)==r['sha256']and len(b)==r['bytes'],'Companion SHA '+r['path'])
    wanted={r['path']:r for r in index['payloadFiles']};require(len(wanted)==len(index['payloadFiles']),'Duplicate allowlist')
    payload={}
    with tarfile.open(archive,'r:gz')as tar:
        members=tar.getmembers();require(len(members)==len(wanted)and{m.name for m in members}==set(wanted),'Exact archive allowlist')
        for member in members:
            require(member.isfile()and member.name.startswith('raw/')and not Path(member.name).is_absolute()and'..'not in Path(member.name).parts,'Unsafe archive member')
            b=tar.extractfile(member).read();r=wanted[member.name];require(len(b)==r['bytes']and sha(b)==r['sha256'],'Payload SHA '+member.name);payload[member.name]=b
    expected_counts={'pi-style':25,'caller-csp':44,'historical-marker-40b6':98,'current-origin-9c09':446,'margin-trim-exact':52,'resource-security':39}
    require(len(index['datasets'])==6,'Dataset count')
    for group,count in expected_counts.items():
        root='raw/'+group+'/';raw_index=payload[root+'sha256-index.json'];seal=json.loads(raw_index);meta=next(x for x in index['datasets']if x['name']==group)
        require(len(seal['files'])==meta['sourceSealPayloadFiles']==count,'Original seal count '+group)
        require(sha(raw_index)==meta['sourceSealSHA256']and meta['archivedFilesIncludingSeal']==count+1,'Original seal identity '+group)
        names={x['path']for x in seal['files']}|{'sha256-index.json'}
        require({n[len(root):]for n in payload if n.startswith(root)}==names,'Original dataset allowlist '+group)
        for r in seal['files']:
            b=payload[root+r['path']];require(len(b)==r['bytes']and sha(b)==r['sha256'],'Original seal file '+group+'/'+r['path'])
    evidence=Evidence(payload)
    # Decode every PNG in the explicit payload, including retained negative images.
    for path in payload:
        if path.endswith('.png'):
            _,group,name=path.split('/',2);evidence.image(group,name)
    results=check_publication(evidence)
    require(summary['findings']['currentMarker']['coreKnownOracleExact']==results['currentMarker']['knownExact']==36,'Summary36')
    require(summary['findings']['currentMarker']['coreNegativeMarginUnknown']==results['currentMarker']['coreUnknown']==3,'Summary3')
    require(summary['findings']['currentMarker']['extraUnknown']==results['currentMarker']['extraUnknown']==6,'Summary6')
    require(summary['findings']['resourceSecurity']['fixedImages']==results['resourceSecurity']['fixedImageCases']==12,'Summary12')
    require(summary['payloadFiles']==len(payload),'Summary payload count')
    print(json.dumps({'verified':True,'payloadFiles':len(payload),'originalDatasetFilesIncludingTheirSeals':sum(x+1 for x in expected_counts.values()),'decodedPNGs':len(evidence.decoded),'checks':results,'browserStarted':False,'networkUsed':False,'archiveCodeExecuted':False},indent=2))


if __name__=='__main__':main()

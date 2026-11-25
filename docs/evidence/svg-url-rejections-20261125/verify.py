"""Portable stdlib verifier; reads only sealed data, never executes archived scripts."""
from pathlib import Path,PurePosixPath
import hashlib,io,json,struct,tarfile,zlib
def sha(data):
    return hashlib.sha256(data).hexdigest()


def png(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, compressed, chunks, header = 8, bytearray(), [], None
    while pos < len(data):
        size = struct.unpack('>I', data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + size]
        crc = struct.unpack('>I', data[pos + 8 + size:pos + 12 + size])[0]
        assert zlib.crc32(kind + body) & 0xffffffff == crc
        chunks.append(kind.decode('ascii'))
        if kind == b'IHDR':
            header = struct.unpack('>IIBBBBB', body)
        if kind == b'IDAT':
            compressed.extend(body)
        pos += size + 12
        if kind == b'IEND':
            break
    assert pos == len(data) and header is not None
    width, height, depth, color, compression, filtering, interlace = header
    assert (depth, compression, filtering, interlace) == (8, 0, 0, 0)
    assert color in (2, 6), ('unsupported PNG color type', color)
    channels = 3 if color == 2 else 4
    stride = width * channels
    decoded = zlib.decompress(bytes(compressed))
    assert len(decoded) == height * (stride + 1)
    previous = bytearray(stride)
    rgba = bytearray()
    for y in range(height):
        at = y * (stride + 1)
        method = decoded[at]
        assert 0 <= method <= 4
        row = bytearray(decoded[at + 1:at + 1 + stride])
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            up = previous[x]
            upper_left = previous[x - channels] if x >= channels else 0
            prediction = 0
            if method == 1:
                prediction = left
            elif method == 2:
                prediction = up
            elif method == 3:
                prediction = (left + up) // 2
            elif method == 4:
                p = left + up - upper_left
                distances = (abs(p - left), abs(p - up), abs(p - upper_left))
                prediction = (left if distances[0] <= distances[1] and distances[0] <= distances[2]
                              else up if distances[1] <= distances[2] else upper_left)
            row[x] = (row[x] + prediction) & 255
        if channels == 4:
            rgba.extend(row)
        else:
            for x in range(0, stride, 3):
                rgba.extend(row[x:x + 3])
                rgba.append(255)
        previous = row
    return width, height, bytes(rgba), chunks


def inspect_var(files):
    def raw(name):return files['var/'+name]
    report=json.loads(raw('results.json'))
    assert len(report['results'])==3 and report['cleanup']['serverClosed']
    assert sha(raw('current.umd.js'))=='9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a'
    rows=[]
    for row in report['results']:
        assert 'error'not in row and row['contextClosed']and row['browserClosed']and row['framesAfter']==0
        assert row['sourceScreenshotUnchanged']and row['sourceDOMUnchanged']
        baseline,temporary=row['privateXML']['modes'];file_url=row['privateXML']['fileURL']
        assert baseline['before']==baseline['after']==temporary['before']==temporary['after']
        assert baseline['literalsAndSerializedXMLUnchanged']and temporary['literalsAndSerializedXMLUnchanged']
        assert temporary['beforeBase']==temporary['duringBase']==temporary['restoredBase']==temporary['measurementBase']
        assert temporary['duringBase']!=file_url
        assert baseline['values']==temporary['values']and row['allComputedFillUnchanged']
        for value in temporary['values']:
            assert value['computedLength']>0 and '/paint/sprite.svg?different#paint'in value['fill']
        assert len(temporary['reads'])==1 and temporary['reads'][0]['styleValue']=='url(sprite.svg?different#paint) purple'
        assert sha(raw(row['engine']+'-private-source.svg'))==row['privateXML']['fetchedTextSHA256']
        before=raw(row['engine']+'-native-before.png');after=raw(row['engine']+'-native-after.png')
        assert before==after and sha(before)==row['nativeSHA256']
        w,h,n,_=png(before);aw,ah,c,_=png(raw(row['engine']+'-current.png'));assert(w,h,aw,ah)==(60,20,60,20)
        columns=[]
        for col,identity in enumerate(report['columns']):
            channels=pixels=0
            for y in range(20):
                for x in range(col*20,col*20+20):
                    at=4*(y*60+x);changed=sum(n[at+k]!=c[at+k]for k in range(4));channels+=changed;pixels+=bool(changed)
            at=4*(10*60+col*20+10)
            columns.append({'id':identity,'differentChannels':channels,'differentPixels':pixels,
                            'nativeCenter':list(n[at:at+4]),'captureCenter':list(c[at:at+4])})
        assert columns==row['current9c09Columns']
        total=sum(x['differentChannels']for x in columns)
        assert total==row['current9c09DifferentChannels']==(1200 if row['engine']=='chromium'else 3600)
        rows.append({'engine':row['engine'],'version':row['version'],'nativeVsCurrentColumns':columns,
                     'differentChannels':total,'fileResponseURL':file_url,'observedBeforeBase':temporary['beforeBase'],
                     'observedDuringBase':temporary['duringBase'],'observedRestoredBase':temporary['restoredBase'],
                     'CSSOMReads':temporary['reads'],'computedFillChanges':0,'sourceXMLAndLiteralsUnchanged':True,
                     'measurementFramesAfter':0,'browserAndContextClosed':True})
    return{'cases':rows,'nativeColumns':9,'privateComputedComparisons':9,'computedFillChanges':0,
           'candidateBuilt':False,'full12Expanded':False,'serverClosed':True,
           'startedUTC':report['startedUTC'],'completedUTC':report['completedUTC']}


def inspect_query(files):
    raw=lambda name:files['query/'+name]
    report=json.loads(raw('results.json'));urls=json.loads(raw('standard-url-analysis.json'))
    assert len(report['cases'])==len(urls['rows'])==6
    assert len(report['HTTPJournal'])==7 and report['totalSourceTrapHTTP']==len(report['sourceTrapHTTP'])==1
    assert sum(x['allowedInitialNavigation']for x in report['HTTPJournal'])==6
    assert report['sourceTrapHTTP'][0]['caseID']==report['cases'][0]['id']
    expected=[[[0,0,0],[1,1,1],[0,0,0],[1,1,1]],[[1,0,0],[1,1,1],[0,0,0],[1,1,1]],
              [[1,1,1],[1,1,1],[1,0,0],[1,1,1]],[[1,1,1],[1,1,1],[1,0,0],[1,1,1]],
              [[1,1,1],[1,1,1],[1,1,1],[1,1,1]],[[1,1,1],[1,1,1],[1,1,1],[1,1,1]]]
    rows=[];rejected=resolved=0
    for i,(row,analysis)in enumerate(zip(report['cases'],urls['rows'])):
        assert 'error'not in row and row['contextClosed']and row['callerUnchanged']
        m=row['measurement'];assert m['baseURI']==m['documentURL']==m['documentURI']==row['url']
        assert m['callerBaseEqualsURL']and analysis['caseID']==row['id']
        exact=row['policy']=='q=1'
        assert analysis['exactPageHrefEqualsDocumentURL']==exact
        assert analysis['standardPageWithoutFragmentHref']==row['url']+(''if exact else'?')
        assert analysis['standardBlobRelativeResolution']['resolved']==analysis['BlobBaseURL']+analysis['token']
        assert m['positiveReady']is False and row['safeRuntimeProbeEligible']is False and m['bboxReady']
        hits=[g['hitPattern']for g in m['measurements']];assert hits==expected[i]
        assert m['filePositive']==(row['engine']=='firefox')and m['flatPositive']
        if row['engine']=='firefox':assert '2500ms nativeuse load guard'in m['loadOutcome']
        else:assert m['loadOutcome']=='all-native-use-loads'
        for index,group in enumerate(m['measurements']):
            assert group['bbox']=={'x':index*24,'y':0,'width':20,'height':20}
        for resource in m['resources']:
            suffix='fileSVG'if resource['role']=='fileClip'else'probeSVG'
            content=raw(row['id']+'-'+suffix+'.svg')
            assert sha(content)==m[suffix+'SHA256']==resource['textSHA256']==resource['before']['bodySHA256']
            assert resource['beforeMatches']and resource['before']['ok']
        cleanup=row['resourceCleanup'];assert cleanup['svgRemoved']and cleanup['listenersRemoved']and cleanup['timerCleared']
        assert m['before']==cleanup['after']and cleanup['after']['frames']==0
        for resource in cleanup['resources']:
            assert resource['revokeCalled']
            if resource['fetchAfterResolved']:
                resolved+=1;assert row['engine']=='webkit'and resource['role']=='probe'and resource['status']==200
                assert 'body'not in resource
            else:rejected+=1
        rows.append({'engine':row['engine'],'policy':row['policy'],'baseURIEqualsDocumentURL':True,
                     'token':m['relativeQueryToken'],'standardPageHrefWithoutFragment':analysis['standardPageWithoutFragmentHref'],
                     'exactSameDocumentHref':exact,'nativeLoadOutcome':m['loadOutcome'],'events':m['events'],
                     'hitPatterns':dict(zip(['direct','variable','absoluteFileClip','flat'],hits)),
                     'filePositive':m['filePositive'],'flatPositive':True,'positiveReady':False,
                     'postRevokeFetch':cleanup['resources'],'callerRestored':True,'contextClosed':True})
    assert rejected==10 and resolved==2
    first=urls['rows'][0];assert first['callerHTTPEvents'][1]['url']==first['actualDocumentURL']+'?'
    assert report['cleanup']['serverClosed']and all(report['cleanup'][e]['browserClosed']for e in ['chromium','firefox','webkit'])
    assert not any(name.startswith('query/')and name.endswith('.png')for name in files)
    return{'cases':rows,'sourceTrapHTTP':report['sourceTrapHTTP'],'HTTPReceipts':7,'initialNavigations':6,
           'positiveReadyCases':0,'postRevokeFetchRejected':10,'postRevokeFetchResolvedHeadersOnly':2,
           'cleanup':report['cleanup'],'startedUTC':report['startedUTC'],'completedUTC':report['completedUTC']}


def main():
    folder=Path(__file__).resolve().parent;index=json.loads((folder/'index.json').read_text())
    for key in ['archive','summary','verifier']:
        r=index[key];content=(folder/r['path']).read_bytes();assert len(content)==r['bytes']and sha(content)==r['sha256']
    files={}
    with tarfile.open(folder/index['archive']['path'],'r:gz')as archive:
        for member in archive.getmembers():
            path=PurePosixPath(member.name)
            assert member.isfile()and not path.is_absolute()and '..'not in path.parts and member.name not in files
            files[member.name]=archive.extractfile(member).read()
    assert len(files)==index['payloadCount']==47
    assert set(files)=={r['path']for r in index['files']}
    for r in index['files']:
        content=files[r['path']];assert len(content)==r['bytes']and sha(content)==r['sha256']
    for prefix,count,seal in [('var',26,'5616a97af07c9ad90649b3cce493c96719b8b608c3f198660b48b2d63c8475d9'),
                              ('query',21,'7fd5166890ae3c116e84d45686bca961bbcc9ebb8d120b278e7b01033874d67d')]:
        original=files[prefix+'/sha256-index.json'];assert sha(original)==seal
        entries=json.loads(original)['files'];assert len(entries)+1==count
        assert {prefix+'/'+r['path']for r in entries}|{prefix+'/sha256-index.json'}=={n for n in files if n.startswith(prefix+'/')}
        for r in entries:
            content=files[prefix+'/'+r['path']];assert len(content)==r['bytes']and sha(content)==r['sha256']
    summary=json.loads((folder/'summary.json').read_text())
    derived={'transientXMLBase':inspect_var(files),'queryClip':inspect_query(files)}
    canonical=json.dumps(derived,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
    assert sha(canonical)==summary['independentDerivationSHA256']
    assert summary['counts']['queryExtraHTTP']==len(derived['queryClip']['sourceTrapHTTP'])==1
    print('Verified47byte-exact originals;9nativePNGcolumns/unchangedCSSOM;fixed6queryrejections;1actualextraHTTP/null-emptyhref;10revokereject+2headers-only200;cleanup. No archived code executed.')


if __name__=='__main__':
    main()

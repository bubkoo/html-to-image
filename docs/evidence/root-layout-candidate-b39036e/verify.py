"""Standalone stdlib evidence verifier; does not execute archived scripts."""
from pathlib import Path,PurePosixPath
from urllib.parse import unquote
import hashlib,json,re,struct,tarfile,zlib
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


def clean(content):
    return re.sub(r'\x1b\[[0-9;]*m','',content.decode())


def counts(content):
    text=clean(content)
    match=re.findall(r'Tests\s+(\d+) failed\s*\|\s*(\d+) passed(?:\s*\|\s*(\d+) skipped)?\s*\((\d+)\)',text)
    assert len(match)==1
    failed,passed,skipped,total=match[0]
    failed,passed,skipped,total=int(failed),int(passed),int(skipped or 0),int(total)
    assert failed+passed+skipped==total
    titles=re.findall(r'^\s*FAIL\s+\|?(chromium|firefox|webkit)\|?\s+test/browser-unit/root-layout.test.ts\s*>\s*(.+)$',text,re.M)
    assert len(set(titles))==failed
    return{'failed':failed,'passed':passed,'skipped':skipped,'total':total,
           'failureTitles':[{'engine':engine,'title':title}for engine,title in sorted(set(titles))]}


def source_snapshot(files,prefix):
    index=json.loads(files[prefix+'/index.json'])
    entries=index if isinstance(index,list)else index['files']
    assert len(entries)==5
    for row in entries:
        content=files[prefix+'/'+row['path']]
        assert sha(content)==row['sha256']
        if 'bytes'in row:assert len(content)==row['bytes']
    spec=files[prefix+'/test/browser-unit/root-layout.test.ts'].decode()
    def array(name):
        body=re.search(r'const '+name+r' = \[(.*?)\]',spec,re.S).group(1)
        return re.findall(r"'([^']+)'",body)
    native,intents=array('nativeCases'),array('intents')
    capture=files[prefix+'/src/capture.ts'].decode();clone=files[prefix+'/src/clone-node.ts'].decode()
    assert capture.index('prepareRootLayout(node')<capture.index('const root = (await cloneNode(')
    assert clone.index('normalizeRootLayout(rootLayout')<clone.index('options.onCloneNode?.(')
    return{'inputHashes':{r['path']:r['sha256']for r in entries},'nativeCases':native,'intentCases':intents,
           'instances':3*(len(native)+len(intents)),'planBeforeCloneCallbacks':True}


def engine_from_ua(ua):
    if 'Firefox/'in ua:return'firefox'
    if 'Chrome/'in ua:return'chromium'
    if 'Safari/'in ua and'AppleWebKit/'in ua:return'webkit'
    raise AssertionError('Unknown fixture UA')


def derive(files):
    runs={name:counts(files[name])for name in ['baseline-targeted.log','candidate-initial-targeted.log','candidate-bounded-targeted.log','candidate-axis-targeted.log','child-logical-diagnostic.log','child-logical-zero-baseline.log','child-logical-zero-candidate.log']}
    for name,expected in [('baseline-targeted.log',(34,59,0,93)),('candidate-initial-targeted.log',(82,11,0,93)),
                          ('candidate-bounded-targeted.log',(116,10,0,126)),('candidate-axis-targeted.log',(133,8,0,141)),
                          ('child-logical-diagnostic.log',(1,2,123,126)),
                          ('child-logical-zero-baseline.log',(1,2,126,129)),('child-logical-zero-candidate.log',(1,2,126,129))]:
        r=runs[name];assert(r['passed'],r['failed'],r['skipped'],r['total'])==expected
    snapshots={phase:source_snapshot(files,'candidate-'+phase+'-inputs')for phase in ['initial','bounded','axis']}
    assert [snapshots[x]['instances']for x in ['initial','bounded','axis']]==[93,126,141]
    assert len(snapshots['axis']['intentCases'])==18
    baseline=json.loads(files['baseline-receipt.json'])
    assert baseline['base']=='2f5b369e376fd462034ee8349125fea9724b61b7'and baseline['exitCode']==1
    assert len(baseline['restored'])==5 and all(baseline['restored'].values())
    assert baseline['candidateInputs']==snapshots['initial']['inputHashes']
    assert len(baseline['baselineInputs'])==5
    zero=json.loads(files['child-logical-zero-baseline-receipt.json'])
    assert'baselineInputs'not in zero and zero['exitCode']==1
    assert len(zero['restored'])==5 and all(zero['restored'].values())
    base_titles={(x['engine'],x['title'])for x in runs['baseline-targeted.log']['failureTitles']}
    final_titles={(x['engine'],x['title'])for x in runs['candidate-axis-targeted.log']['failureTitles']}
    assert final_titles<=base_titles
    assert all('preserves explicit'not in title for engine,title in final_titles)
    assert all(not any(name in title for name in ['margin-bottom','bottom-'])for engine,title in final_titles)
    commit=json.loads(files['final-commit-receipt.json'])
    assert commit['head']=='b39036e8247c92136dae68b96cec9a63732372f5'
    assert commit['tree']=='c4789b4df229456dd42b8f17114c964c8f81571f'
    assert commit['base']==baseline['base']and commit['trackedStatus']==''
    assert commit['remoteReadback'].split()[0]==commit['head']
    assert{r['path']:r['sha256']for r in commit['files']}==snapshots['axis']['inputHashes']
    assert all(r['matchesMeasuredInput']and r['matchesCommittedBytes']for r in commit['files'])
    for row in commit['files']:assert len(files['candidate-axis-inputs/'+row['path']])==row['bytes']
    static=json.loads(files['final-static-receipt.json'])
    assert{r['label']:r['exitCode']for r in static}=={'types':0,'lint':0,'format':0}
    pairs=[]
    for name in sorted(files):
        if not name.endswith('.json')or not any(name.startswith(d)for d in ['child-logical-diagnostic/','child-logical-zero-baseline-artifacts/','child-logical-zero-candidate-artifacts/']):continue
        record=json.loads(files[name]);prefix=name[:-5];native_name=prefix+'-native.png';capture_name=prefix+'-capture.png'
        w,h,n,_=png(files[native_name]);aw,ah,a,_=png(files[capture_name]);assert(w,h,aw,ah)==(160,80,160,80)
        assert set(a[3::4])<={0,255}
        opaque=bytearray(a)
        for at in range(0,len(a),4):
            alpha=a[at+3]
            for k in range(3):opaque[at+k]=(a[at+k]*alpha+255*(255-alpha)+127)//255
            opaque[at+3]=255
        different=sum(x!=y for x,y in zip(n,opaque))
        assert different==record['nativeDifferentChannels']
        alpha_diff=sum(a[4*(y*160+x)+3]!=(0 if y<16 else 255)for y in range(80)for x in range(160))
        assert alpha_diff==record['alphaDifferentPixels']
        svg=unquote(record['frozenSVG'].split(',',1)[1]).encode()
        if prefix+'.svg'in files:assert files[prefix+'.svg']==svg
        engine=engine_from_ua(record['userAgent']);assert engine in ['chromium','webkit']
        expected=5120 if name.startswith('child-logical-zero-baseline-artifacts/')else 10240
        assert different==expected and alpha_diff==(1280 if expected==5120 else 2560)
        pairs.append({'record':name,'engineFromUserAgent':engine,'nativePNG':native_name,'capturePNG':capture_name,
                      'nativeSHA256':sha(files[native_name]),'captureSHA256':sha(files[capture_name]),
                      'SVGFromRecordSHA256':sha(svg),'separateSVGMember':prefix+'.svg'if prefix+'.svg'in files else None,
                      'differentChannelsOverWhite':different,'rawAlphaErrorAgainstDeclaredTop16Contract':alpha_diff})
    assert len(pairs)==6
    screenshots=[]
    for phase,folder,log in [('baseline','baseline-failure-screenshots','baseline-targeted.log'),
                             ('initial','candidate-initial-failure-screenshots','candidate-initial-targeted.log'),
                             ('bounded','candidate-bounded-failure-screenshots','candidate-bounded-targeted.log'),
                             ('axis','candidate-axis-failure-screenshots','candidate-axis-targeted.log')]:
        referenced=set(re.findall(r'failure-screenshots/root-layout\.test\.ts/([^\s]+\.png)',clean(files[log])))
        for name in sorted(files):
            if name.startswith(folder+'/')and name.endswith('.png'):
                screenshots.append({'path':name,'phase':phase,'engine':None,
                                    'referencedInThisLog':PurePosixPath(name).name in referenced,
                                    'kind':'provider viewport failure screenshot; same-name engine overwrite/stale risk; not native/export pair'})
    cleanup=json.loads(files['final-cleanup-receipt.json'])
    assert cleanup['allOwnVitestExecSessionsTerminal']and cleanup['customHTTPServersStarted']==0
    assert cleanup['phoneOperations']==cleanup['networkSettingsChanges']==0
    return{'runs':runs,'sourceSnapshots':snapshots,'baseline93RecordedInputs':baseline['baselineInputs'],
           'baseline93RestoredFive':True,'zeroIsolationBeforeInputs':zero['before'],
           'zeroIsolationBaselineInputsMissing':True,'zeroIsolationRestoredFive':True,
           'pairedImages':pairs,'providerScreenshots':screenshots,'finalFailuresSubsetOfBaselineTitles':True,
           'finalCommitReceipt':commit,'staticExitCodes':{r['label']:r['exitCode']for r in static},'cleanup':cleanup}


def main():
    folder=Path(__file__).resolve().parent;index=json.loads((folder/'index.json').read_text())
    for key in ['archive','summary','verifier']:
        row=index[key];content=(folder/row['path']).read_bytes();assert len(content)==row['bytes']and sha(content)==row['sha256']
    files={}
    with tarfile.open(folder/index['archive']['path'],'r:gz')as archive:
        for member in archive.getmembers():
            path=PurePosixPath(member.name)
            assert member.isfile()and not path.is_absolute()and '..'not in path.parts and member.name not in files
            files[member.name]=archive.extractfile(member).read()
    assert len(files)==index['payloadCount']
    assert set(files)=={r['path']for r in index['files']}
    for row in index['files']:
        content=files[row['path']];assert len(content)==row['bytes']and sha(content)==row['sha256']
    excluded={r['path']:r for r in index['excluded']};assert len(excluded)==12
    permitted=set()
    for seal in index['sourceSeals']:
        content=files[seal['path']];assert sha(content)==seal['sha256']
        records=json.loads(content)['files'];assert len(records)==seal['originalMemberCount']
        permitted.add(seal['path'])
        for row in records:
            if row['path']in excluded:
                assert row['sha256']==excluded[row['path']]['sha256']and row['path']not in files
                continue
            permitted.add(row['path']);assert sha(files[row['path']])==row['sha256']and len(files[row['path']])==row['bytes']
    assert permitted==set(files)
    derived=derive(files);summary=json.loads((folder/'summary.json').read_text())
    digest=sha(json.dumps(derived,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode())
    assert digest==summary['independentDerivationSHA256']
    assert derived['pairedImages']==index['pairedEvidence']
    print('Verified original93 34/59,initial93 82/11,bounded126 116/10,axis141 133/8;5input snapshots;6RGBA/native/SVG pairs;viewport caveats;zero-baseline gap;static/commit/cleanup. No archived code executed.')


if __name__=='__main__':main()

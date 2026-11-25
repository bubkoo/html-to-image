"""Portable stdlib verification of frozen remote evidence; no network or extraction."""
from pathlib import Path, PurePosixPath
import base64
import hashlib
import io
import json
import re
import stat
import tarfile
import zipfile

HEAD = '8fb282ca769c297ec3833787e660f22ceb057c46'
BASE = 'f8d1c4b1abb7decf143fdf418ad08fa8b22bd309'
MERGE = '57ab218860d37aa310a154e014ccfb3b35952a91'
TREE = 'c3acd5e2f924d3c144275deff400da0dd9774f5d'
ZIP_SHA = '09888ad021dd2fe162d7affae74d9c1896f8cf0fa2fb6b5a1c0f1eb2331040d8'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def derive(files):
    def data(path):
        return json.loads(files[path])
    head, merge = data('head-commit.json'), data('tested-merge-commit.json')
    assert head['sha'] == HEAD and head['tree']['sha'] == TREE
    assert [p['sha'] for p in head['parents']] == [BASE]
    assert merge['sha'] == MERGE and merge['tree']['sha'] == TREE
    assert [p['sha'] for p in merge['parents']] == [BASE, HEAD]
    ci, ql = data('ci-terminal.json'), data('codeql-terminal.json')
    assert (ci['id'], ci['head_sha'], ci['conclusion'], ci['status'], ci['run_attempt']) == (45522024628, HEAD, 'failure', 'completed', 1)
    assert (ql['id'], ql['head_sha'], ql['conclusion'], ql['status'], ql['run_attempt']) == (45522024385, HEAD, 'success', 'completed', 1)
    job = data('ci-jobs-terminal.json')['jobs'][0]
    qjob = data('codeql-jobs-terminal.json')['jobs'][0]
    assert (job['id'], job['run_id'], job['head_sha'], job['conclusion']) == (138896004801, ci['id'], HEAD, 'failure')
    assert (qjob['id'], qjob['run_id'], qjob['head_sha'], qjob['conclusion']) == (138896004312, ql['id'], HEAD, 'success')
    steps = {r['number']: r for r in job['steps']}
    for number, expected in [(7, 'success'), (8, 'success'), (9, 'success'), (10, 'success'),
                             (12, 'failure'), (13, 'skipped'), (14, 'success'),
                             (16, 'skipped'), (17, 'skipped')]:
        assert steps[number]['conclusion'] == expected
    log = re.sub(r'\x1b\[[0-9;]*m', '', files['ci-job-138896004801.log'].decode())
    qlog = re.sub(r'\x1b\[[0-9;]*m', '', files['codeql-job-138896004312.log'].decode())
    assert 'Tested checkout: ' + MERGE in log
    for text in [log, qlog]:
        assert MERGE in text and 'HEAD is now at 57ab218 Merge ' + HEAD + ' into ' + BASE in text
    assert re.search(r'Tests\s+1234 passed\s*\|\s*4 skipped', log)
    assert re.search(r'Tests\s+3 failed\s*\|\s*1112 passed\s*\|\s*4 skipped', log)
    failures = [line.strip() for line in log.splitlines()
                if re.search(r'\bFAIL\s+firefox\s+test/browser-unit/resource-resolver-cancellation.test.ts', line)]
    assert len(failures) == 3
    annotations = re.findall(r'##\[error\]AssertionError: (\{"nativeCollected":(?:true|false),"ownerCollected":false\})', log)
    assert len(annotations) == 2
    assert sorted(json.loads(x)['nativeCollected'] for x in annotations) == [False, True]
    zipped = files['playwright-report.zip']
    assert len(zipped) == 14999 and sha(zipped) == ZIP_SHA
    artifact = data('ci-artifacts.json')['artifacts'][0]
    assert artifact['id'] == 14980382454 and artifact['size_in_bytes'] == 14999
    assert artifact['digest'] == 'sha256:' + ZIP_SHA
    assert artifact['workflow_run']['id'] == ci['id'] and artifact['workflow_run']['head_sha'] == HEAD
    records = data('artifact-index.json')['members']
    with zipfile.ZipFile(io.BytesIO(zipped)) as archive:
        assert archive.testzip() is None
        members = archive.infolist()
        assert len(members) == len(records) == 22
        assert len({m.filename for m in members}) == 22
        expected = {r['path']: r for r in records}
        for member in members:
            path = PurePosixPath(member.filename)
            assert not path.is_absolute() and '..' not in path.parts and not member.is_dir()
            assert not stat.S_ISLNK(member.external_attr >> 16)
            content = archive.read(member)
            assert len(content) == expected[member.filename]['bytes']
            assert sha(content) == expected[member.filename]['sha256']
            assert content == files['artifact/' + member.filename]
    ids = ['1daad9c7-3bd0-4a35-9b99-e9fb8d53076c',
           'd24c460f-856e-4675-be0d-278ba016aed5',
           'e10a9c3a-9eff-4f81-9881-b089a5afd13b']
    cases = []
    for identity in ids:
        prefix = 'artifact/.vitest/attachments/gc-heap/' + identity + '/'
        before, after, transport = [data(prefix + n + '.json') for n in ['before', 'after', 'transport']]
        assert before['id'] == after['id'] == identity
        assert before['browser'] == after['browser'] == 'firefox'
        assert before['originalCollected'] is after['originalCollected'] is False
        assert before['alive'] is after['alive'] is True
        assert before['snapshotConfirmed'] is after['snapshotConfirmed'] is False
        assert after['markerRemoved'] is True and after['observation'] == 'after-diagnostic-await'
        assert transport['status'] == 'unsupported' and transport['reason'] == 'Native Heap protocol is WebKit-only'
        assert prefix + 'heap.json' not in files
        cases.append({'id': identity, 'before': before, 'after': after, 'transport': transport,
                      'heapPresent': False})
    assert not any(name.endswith('/heap.json') for name in files)
    source_index = data('head-source-index.json')
    assert source_index['head'] == HEAD and len(source_index['files']) == 6
    for record in source_index['files']:
        content = files['head-source/' + record['path']]
        assert len(content) == record['bytes'] and sha(content) == record['sha256']
        git_blob = hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()
        assert git_blob == record['blobSHA']
        api = data('head-source-' + record['path'].replace('/', '__') + '.json')
        assert api['sha'] == git_blob and api['path'] == record['path']
        assert base64.b64decode(api['content']) == content
    return {'head': HEAD, 'base': BASE, 'testedMerge': MERGE, 'mergeParents': [BASE, HEAD],
            'tree': TREE, 'mergeTreeEqualsHeadTree': True,
            'CI': {'run': ci['id'], 'job': job['id'], 'attempt': 1, 'conclusion': 'failure',
                   'createdUTC': ci['created_at'], 'completedUTC': job['completed_at'],
                   'coveragePassed': 1234, 'sourcePassed': 1112, 'sourceFailed': 3, 'skippedEach': 4,
                   'steps': [{'number': n, 'name': steps[n]['name'], 'conclusion': steps[n]['conclusion']}
                             for n in [7, 8, 9, 10, 12, 13, 14, 16, 17]],
                   'failureLines': failures, 'disposedControlAnnotationValues': [json.loads(x) for x in annotations]},
            'CodeQL': {'run': ql['id'], 'job': qjob['id'], 'attempt': 1, 'conclusion': 'success',
                       'completedUTC': qjob['completed_at']},
            'artifact': {'id': artifact['id'], 'zipBytes': len(zipped), 'sha256': sha(zipped),
                         'apiDigestMatched': True, 'CRCChecked': True, 'members': 22, 'actualHeaps': 0},
            'cases': cases, 'pinnedRemoteSourceFiles': source_index['files']}


def main():
    folder = Path(__file__).resolve().parent
    index = json.loads((folder / 'index.json').read_text())
    for key in ['archive', 'summary', 'verifier']:
        r = index[key]
        content = (folder / r['path']).read_bytes()
        assert len(content) == r['bytes'] and sha(content) == r['sha256']
    files = {}
    with tarfile.open(folder / index['archive']['path'], 'r:gz') as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            assert member.isfile() and not path.is_absolute() and '..' not in path.parts
            assert member.name not in files
            files[member.name] = archive.extractfile(member).read()
    assert len(files) == index['payloadCount'] == 72
    assert set(files) == {r['path'] for r in index['files']}
    for r in index['files']:
        content = files[r['path']]
        assert len(content) == r['bytes'] and sha(content) == r['sha256']
    assert sha(files['sha256-index.json']) == '3551689ec751be21ff4c5579297020df0dc3433d6c9b7c3834c565b425719215'
    original = json.loads(files['sha256-index.json'])
    assert {r['path'] for r in original} | {'sha256-index.json'} == set(files)
    for r in original:
        content = files[r['path']]
        assert len(content) == r['bytes'] and sha(content) == r['sha256']
    summary = json.loads((folder / 'summary.json').read_text())
    assert derive(files) == summary['independentChecks']
    assert summary['privacy']['redactionCount'] == 0
    print('Verified72 original payloads; fixed8fb/57ab/f8d/tree;CI+CodeQL;1234/1112+3/4;steps;14999-byte ZIP CRC+22members;3Firefox unsupported/noheap false verdicts.')


if __name__ == '__main__':
    main()

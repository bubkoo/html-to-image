"""Static stdlib verification of sealed M035 remote success evidence."""
from pathlib import Path, PurePosixPath
import base64
import hashlib
import io
import json
import re
import stat
import tarfile
import zipfile

HEAD = '03538420fd6cbffe435f568ce9beee3d425211a2'
BASE = '877c476888bbc2146a15d3c673f7a3385f3b9ddb'
OLD = '8fb282ca769c297ec3833787e660f22ceb057c46'
MERGE = '6f270dcac2402baf6ecdbe01c0e92ddaf018d05d'
TREE = '6706b7a4226bc6b23d307c74de94a1a3bf6fe469'
SRC = '963f0a731dd4bb82c329a2d7fda5603618d6c4c7'
ZIP_SHA = 'd1e01f81dbb15224b422fc1a04acccae0ce1197a12885d3409f0281d8b2b61f6'
SEAL_SHA = 'e7d088f9fa7295f57726064aad14e58e1a07a8a643b25adc41ddf20128ebbd7c'


def sha(content):
    return hashlib.sha256(content).hexdigest()


def git_blob(content):
    return hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()


def derive(files):
    def data(path):
        return json.loads(files[path])
    head, base, merge = [data(name + '-commit.json') for name in ['head', 'base', 'tested-merge']]
    assert head['sha'] == HEAD and base['sha'] == BASE and merge['sha'] == MERGE
    assert [x['sha'] for x in head['parents']] == [OLD, BASE]
    assert [x['sha'] for x in merge['parents']] == [BASE, HEAD]
    assert head['tree']['sha'] == merge['tree']['sha'] == TREE
    for name, expected in [('head', TREE), ('base', base['tree']['sha'])]:
        tree = data(name + '-tree.json')
        assert tree['sha'] == expected and tree['truncated'] is False
        assert next(x['sha'] for x in tree['tree'] if x['path'] == 'src') == SRC
    pr = data('pr-terminal.json')
    assert pr['head']['sha'] == HEAD and pr['base']['sha'] == BASE and pr['changed_files'] == 9
    ci = data('ci-terminal.json')
    assert (ci['id'], ci['head_sha'], ci['conclusion'], ci['status'], ci['run_attempt']) == (45524225763, HEAD, 'success', 'completed', 1)
    jobs = data('ci-jobs-terminal.json')
    assert jobs['total_count'] == len(jobs['jobs']) == 1
    job = jobs['jobs'][0]
    assert (job['id'], job['run_id'], job['head_sha'], job['conclusion']) == (138903432506, ci['id'], HEAD, 'success')
    steps = {x['number']: x for x in job['steps']}
    for n in [7, 8, 9, 10, 12, 13, 14, 17]:
        assert steps[n]['conclusion'] == 'success'
    assert steps[15]['conclusion'] == steps[16]['conclusion'] == 'skipped'
    log = re.sub(r'\x1b\[[0-9;]*m', '', files['ci-job-138903432506.log'].decode())
    assert 'Tested checkout: ' + MERGE in log
    assert 'HEAD is now at 6f270dc Merge ' + HEAD + ' into ' + BASE in log
    assert re.search(r'Tests\s+1300 passed\s*\|\s*4 skipped', log)
    assert re.search(r'Tests\s+1181 passed\s*\|\s*4 skipped', log)
    assert re.search(r'\b162 passed\b', log)
    package_segment = log[log.index('##[group]Run pnpm run test:browser:package'):]
    assert not re.search(r'\b\d+\s+skipped\b', package_segment)
    assert '+ playwright 1.64.1' in log
    assert 'queued for processing' in log.lower()
    assert HEAD in log
    early = data('head-check-runs-terminal.json')
    final = data('head-check-runs-final.json')
    assert not any(x['name'].lower().startswith('codecov/') for x in early['check_runs'])
    contexts = []
    for identity, name in [(138906823239, 'codecov/patch'), (138906809006, 'codecov/project')]:
        check = next(x for x in final['check_runs'] if x['id'] == identity)
        assert check['name'] == name and check['head_sha'] == HEAD
        assert check['status'] == 'completed' and check['conclusion'] == 'success'
        contexts.append({k: check[k] for k in ['id', 'name', 'head_sha', 'status', 'conclusion', 'completed_at', 'details_url', 'html_url']})
    all_runs = data('head-all-workflow-runs-terminal.json')
    assert all_runs['total_count'] == len(all_runs['workflow_runs']) == 4
    assert all(x['head_sha'] == HEAD for x in all_runs['workflow_runs'])
    assert not any('codeql' in x['name'].lower() for x in all_runs['workflow_runs'])
    policy = files['workflow/codeql.yml']
    assert re.search(rb'pull_request:\s*\n\s*branches:\s*\[\s*"master"\s*\]', policy)
    assert pr['base']['ref'] == 'codex/document-property-lifetime' and pr['base']['ref'] != 'master'
    source = data('head-source-index.json')
    assert source['head'] == HEAD and len(source['files']) == 9
    for record in source['files']:
        content = files['head-source/' + record['path']]
        assert len(content) == record['bytes'] and sha(content) == record['sha256']
        assert git_blob(content) == record['blobSHA1']
        api = data('head-source-' + record['path'].replace('/', '__') + '.json')
        assert api['path'] == record['path'] and api['sha'] == record['blobSHA1']
        assert base64.b64decode(api['content']) == content
        assert '/' + HEAD + '/' in api['html_url']
    for name in ['ci.yml', 'codeql.yml']:
        content = files['workflow/' + name]
        api = data('workflow-' + name + '-api.json')
        assert api['sha'] == git_blob(content) and base64.b64decode(api['content']) == content
        assert '/' + HEAD + '/' in api['html_url']
    zipped = files['playwright-report.zip']
    assert len(zipped) == 256362 and sha(zipped) == ZIP_SHA
    artifact = data('ci-artifacts.json')['artifacts'][0]
    assert artifact['id'] == 14981927626 and artifact['size_in_bytes'] == 256362
    assert artifact['digest'] == 'sha256:' + ZIP_SHA
    assert artifact['workflow_run']['id'] == ci['id'] and artifact['workflow_run']['head_sha'] == HEAD
    expected = {r['path']: r for r in data('artifact-index.json')['members']}
    with zipfile.ZipFile(io.BytesIO(zipped)) as archive:
        assert archive.testzip() is None
        members = archive.infolist()
        assert len(members) == len(expected) == 8 and len({x.filename for x in members}) == 8
        assert not any('gc-heap/' in x.filename for x in members)
        for member in members:
            path = PurePosixPath(member.filename)
            assert not path.is_absolute() and '..' not in path.parts and not member.is_dir()
            assert not stat.S_ISLNK(member.external_attr >> 16)
            content = archive.read(member)
            assert content == files['artifact/' + member.filename]
            assert len(content) == expected[member.filename]['bytes'] and sha(content) == expected[member.filename]['sha256']
    assert not any(name.endswith('/heap.json') for name in files)
    return {'head': HEAD, 'headParents': [OLD, BASE], 'base': BASE, 'baseRef': pr['base']['ref'],
            'changedFiles': 9, 'testedMerge': MERGE, 'mergeParents': [BASE, HEAD],
            'headAndMergeTree': TREE, 'srcTreeExactly650': SRC,
            'CI': {'run': ci['id'], 'job': job['id'], 'attempt': 1, 'conclusion': 'success',
                   'startedUTC': job['started_at'], 'completedUTC': job['completed_at'],
                   'coveragePassed': 1300, 'coverageSkipped': 4, 'sourcePassed': 1181,
                   'sourceSkipped': 4, 'packagePassed': 162, 'packageSkipped': 0,
                   'steps': [{'number': n, 'name': steps[n]['name'], 'conclusion': steps[n]['conclusion']}
                             for n in [7, 8, 9, 10, 12, 13, 14, 15, 16, 17]]},
            'Codecov': {'uploadStepSuccess': True, 'uploadLogQueuedOnly': True,
                        'earlyTerminalExternalChecksAbsent': True, 'finalExternalChecks': contexts,
                        'finalReadUTC': data('read-times-final-status.json')['head-check-runs-final']},
            'CodeQL': {'currentHeadRunsCount': 4, 'runIDs': [x['id'] for x in all_runs['workflow_runs']],
                       'currentHeadCodeQLRunCount': 0, 'workflowPullRequestTarget': 'master',
                       'scope': 'Not scheduled on this current integration head; no inherited CodeQL verdict.'},
            'sourceFiles': source['files'], 'workflowBytesPinnedToHead': True,
            'artifact': {'id': artifact['id'], 'zipBytes': len(zipped), 'sha256': sha(zipped),
                         'apiDigestMatched': True, 'CRCChecked': True, 'members': 8, 'gcHeapMembers': 0}}


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
    assert len(files) == index['payloadCount'] == 76
    assert set(files) == {r['path'] for r in index['files']}
    for r in index['files']:
        content = files[r['path']]
        assert len(content) == r['bytes'] and sha(content) == r['sha256']
    assert sha(files['sha256-index.json']) == SEAL_SHA
    original = json.loads(files['sha256-index.json'])
    assert {r['path'] for r in original} | {'sha256-index.json'} == set(files)
    for r in original:
        content = files[r['path']]
        assert len(content) == r['bytes'] and sha(content) == r['sha256']
    summary = json.loads((folder / 'summary.json').read_text())
    assert derive(files) == summary['independentChecks']
    assert summary['privacy']['redactionCount'] == 0
    print('Verified76 originals;M035/6f270d parents/tree/src650;CI1300/1181/162;upload separate from external Codecove2success;CodeQLnotScheduled;9sources/workflows;256362BZIP CRC/8memberSHA/noheap.')


if __name__ == '__main__':
    main()

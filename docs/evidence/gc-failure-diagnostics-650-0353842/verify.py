"""Portable stdlib-only evidence verifier. No browser, tests, Git writes or extraction."""
from pathlib import Path, PurePosixPath
import base64
import hashlib
import json
import re
import tarfile


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_hash(kind, data):
    return hashlib.sha1(kind.encode() + b' ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def git_tree(data):
    result, pos = {}, 0
    while pos < len(data):
        space = data.index(b' ', pos)
        end = data.index(b'\0', space)
        mode = data[pos:space].decode()
        name = data[space + 1:end].decode()
        oid = data[end + 1:end + 21].hex()
        result[name] = (mode, oid)
        pos = end + 21
    assert pos == len(data)
    return result


def heap_evidence(files, prefix):
    before = json.loads(files[prefix + '/before.json'])
    after = json.loads(files[prefix + '/after.json'])
    transport = json.loads(files[prefix + '/transport.json'])
    heap_bytes = files[prefix + '/heap.json']
    assert transport['status'] == 'saved' and transport['sha256'] == sha(heap_bytes)
    assert transport['bytes'] == len(heap_bytes)
    heap = json.loads(json.loads(heap_bytes)['snapshotData'])
    assert heap['version'] == 3 and heap['type'] == 'Inspector'
    nodes, edges = heap['nodes'], heap['edges']
    assert len(nodes) % 4 == len(edges) % 4 == 0
    classes = {nodes[i]: {'class': heap['nodeClassNames'][nodes[i + 2]], 'flags': nodes[i + 3]}
               for i in range(0, len(nodes), 4)}
    properties = []
    for i in range(0, len(edges), 4):
        source, target, kind, name = edges[i:i + 4]
        if heap['edgeTypes'][kind] == 'Property':
            properties.append({'from': source, 'to': target, 'name': heap['edgeNames'][name]})
    markers = [edge for edge in properties if edge['name'] == before['marker']]
    holders = [edge for edge in properties if edge['name'] == '__gcKnownStrongHolder']
    owners = [edge for edge in properties if edge['name'] == 'sourceDocument']
    chains = [{'holder': holder, 'source': owner, 'marker': marker,
               'sourceClass': classes[owner['to']]}
              for holder in holders for owner in owners for marker in markers
              if holder['to'] == owner['from'] and owner['to'] == marker['from']]
    return {'prefix': prefix, 'heapSHA256': sha(heap_bytes), 'heapBytes': len(heap_bytes),
            'before': before, 'after': after, 'transport': transport,
            'markerPropertyEdges': markers, 'knownStrongHolderChains': chains}


HEAD = '03538420fd6cbffe435f568ce9beee3d425211a2'
OLD = '8fb282ca769c297ec3833787e660f22ceb057c46'
BASE650 = '877c476888bbc2146a15d3c673f7a3385f3b9ddb'
TREE = '6706b7a4226bc6b23d307c74de94a1a3bf6fe469'
SRC = '963f0a731dd4bb82c329a2d7fda5603618d6c4c7'


def verify_git(proof, files):
    headers = {}
    for name in ['candidate', 'base650', 'firstParent']:
        record = proof[name]
        content = base64.b64decode(record['commitBase64'])
        assert git_hash('commit', content) == record['commit']
        headers[name] = content.split(b'\n\n', 1)[0].decode().splitlines()
        assert next(x[5:] for x in headers[name] if x.startswith('tree ')) == record['tree']
    assert proof['candidate']['commit'] == HEAD and proof['candidate']['tree'] == TREE
    assert proof['base650']['commit'] == BASE650 and proof['firstParent']['commit'] == OLD
    assert [x[7:] for x in headers['candidate'] if x.startswith('parent ')] == [OLD, BASE650]
    trees = {}
    for oid, encoded in proof['trees'].items():
        content = base64.b64decode(encoded)
        assert git_hash('tree', content) == oid
        trees[oid] = git_tree(content)
    def diff(old, new, prefix=''):
        changes = []
        left, right = trees[old], trees[new]
        for name in sorted(set(left) | set(right)):
            a, b = left.get(name), right.get(name)
            if a == b:
                continue
            if a and b and a[0] == b[0] == '40000':
                changes.extend(diff(a[1], b[1], prefix + name + '/'))
            else:
                changes.append(prefix + name)
        return changes
    def entry(name, path):
        tree = trees[proof[name]['tree']]
        parts = path.split('/')
        for part in parts[:-1]:
            tree = trees[tree[part][1]]
        return tree[parts[-1]]
    identity = json.loads(files['author/identity.json'])
    expected = identity['changedFilesRelative650']
    changes = diff(proof['base650']['tree'], TREE)
    assert sorted(changes) == sorted(r['path'] for r in expected) and len(changes) == 9
    for record in expected:
        content = files['author/final-source/' + record['path']]
        assert sha(content) == record['sha256']
        assert git_hash('blob', content) == entry('candidate', record['path'])[1]
        assert files['review/source/' + record['path']] == content
    for path in ['src', 'package.json', 'pnpm-lock.yaml', 'test/browser/gc-frame.mjs', 'test/browser/gc-frame.d.mts']:
        assert entry('candidate', path) == entry('base650', path)
    assert entry('candidate', 'src')[1] == SRC
    assert entry('candidate', 'src') != entry('firstParent', 'src')
    source_changes = [p for p in diff(proof['firstParent']['tree'], TREE) if p.startswith('src/')]
    assert len(source_changes) == 15
    lexical = []
    for path, encoded in proof['parentCallSiteSources'].items():
        content = base64.b64decode(encoded)
        assert git_hash('blob', content) == entry('base650', path)[1]
        current = files['author/final-source/' + path]
        old_text, new_text = content.decode(), current.decode()
        gc = lambda text: len(re.findall(r'\.collectGarbage\(', text))
        deref = lambda text: len(re.findall(r'\.deref\(', text))
        assert gc(old_text) == gc(new_text) and deref(old_text) == deref(new_text)
        lexical.append({'path': path, 'parentGCRequests': gc(old_text), 'integrationGCRequests': gc(new_text),
                        'parentDerefCalls': deref(old_text), 'integrationDerefCalls': deref(new_text)})
    return {'commit': HEAD, 'parents': [OLD, BASE650], 'tree': TREE, 'srcTree': SRC,
            'relative650ChangedFiles': changes, 'relative650SourceAndDependenciesAndGCFrameEqual': True,
            'sourceChangesRelative8fb': source_changes, 'callSiteCounts': sorted(lexical, key=lambda r: r['path'])}


def derive(files):
    def data(name):
        return json.loads(files['author/' + name])
    identity = data('identity.json')
    assert identity['head'] == HEAD and identity['tree'] == TREE and identity['parents'] == [OLD, BASE650]
    final = {r['path']: r['sha256'] for r in identity['changedFilesRelative650']}
    stages, canonical = [], None
    for family, names in [('full-checks', ['lint', 'build', 'types', 'consumers']),
                          ('full-browser-checks', ['default', 'browser-package'])]:
        receipt = data(family + '/receipt.json')
        assert receipt['base'] == HEAD
        for name in names:
            before = data(family + '/' + name + '-inputs-before.json')
            after = data(family + '/' + name + '-inputs-after.json')
            assert len(before) == len(after) == 299 and before == after
            if canonical is None:
                canonical = before
            assert canonical == before
            mapping = {r['path']: r['sha256'] for r in before}
            assert all(mapping[path] == value for path, value in final.items())
            row = next(x for x in receipt['stages'] if x['name'] == name)
            assert row['exitCode'] == 0 and row['inputsUnchanged'] and row['inputCount'] == 299
            stages.append({'family': family, 'stage': name, 'startedUTC': row['startedUTC'],
                           'completedUTC': row['completedUTC'], 'inputCount': 299, 'exitCode': 0,
                           'beforeAfterEqual': True, 'sameCanonicalMInputs': True, 'finalNineExact': True})
    log = files['author/full-browser-checks/default.log'].decode()
    assert re.findall(r'Tests\s+(\d+) passed \| (\d+) skipped', log) == [('1300', '4'), ('1181', '4')]
    package = files['author/full-browser-checks/browser-package.log'].decode()
    assert re.search(r'\b162 passed\b', package) and not re.search(r'\d+ skipped', package)
    nb, na = data('node-inputs-before.json'), data('node-inputs-after.json')
    assert nb['head'] == na['head'] == HEAD and nb['nodeBefore'] == na['nodeBefore']
    assert {r['path']: r['sha256'] for r in nb['nodeBefore']} == final and na['unchanged']
    gates = data('node-gates-results.json')
    assert gates['result'] == 'all passed' and len(gates['rows']) == 8 and gates['unhandled'] == []
    unsupported = [name.rsplit('/', 1)[0] for name in files if name.startswith('author/node-budget-artifacts/') and name.endswith('-unsupported/before.json')]
    assert len(unsupported) == 1
    nc_before, nc_after = [json.loads(files[unsupported[0] + '/' + x + '.json']) for x in ['before', 'after']]
    assert nc_before['context'] == nc_after['context'] == {'nativeCollected': True, 'ownerCollected': False, 'probed': True}
    receipt = data('final-two-controls/receipt.json')
    assert receipt['head'] == HEAD and receipt['inputsBefore'] == receipt['inputsAfter']
    assert {r['path']: r['sha256'] for r in receipt['inputsBefore']} == final
    assert receipt['gcRequests'] == 6 and receipt['heapSnapshotRequests'] == 1
    assert receipt['successCaseDiagnosticRequests'] == 0 and receipt['exitCode'] == 1
    calls = data('final-two-controls/command-calls.json')
    assert calls == receipt['calls'] and sum(r['command'] == 'collectGarbage' for r in calls) == 6
    assert [r['phase'] for r in calls if r['command'] == 'captureGCFailureHeap'] == ['snapshot', 'after']
    control_log = files['author/final-two-controls/run.log'].decode()
    assert re.search(r'Tests\s+1 failed \| 1 passed \(2\)', control_log)
    positive = heap_evidence(files, 'author/final-two-controls/artifacts/32b41f9a-cea2-4336-b1d3-11db02188d06')
    assert len(positive['markerPropertyEdges']) == len(positive['knownStrongHolderChains']) == 1
    before, after = positive['before'], positive['after']
    assert before['originalCollected'] is after['originalCollected'] is False
    assert before['alive'] is after['alive'] is True
    context = {'originalCollected': False, 'held': True, 'label': 'deliberate-strong-held-control',
               'primaryGCRequests': 3, 'nullable': None}
    assert before['context'] == after['context'] == context
    assert all(type(x) in [str, int, float, bool, type(None)] for x in context.values())
    assert after['snapshotConfirmed'] and after['snapshotFinishedUTC'] == positive['transport']['snapshotFinishedUTC']
    assert after['observation'] == 'after-diagnostic-await' and after['markerRemoved']
    validation = data('final-two-controls/validation.json')
    assert validation['head'] == HEAD and validation['contextBefore'] == validation['contextAfter'] == context
    assert validation['contextMatchesEveryScalar'] and validation['originalFalseUnchanged']
    cleanup = data('cleanup.json')
    assert cleanup['allRecordedPIDsAbsent'] and cleanup['psExit'] == 1
    assert all(row['absent'] and row['exitCode'] == 1 for row in cleanup['ports'].values())
    return {'head': HEAD, 'stages': stages, 'coveragePassed': 1300, 'sourcePassed': 1181,
            'coverageSkipped': 4, 'sourceSkipped': 4, 'packagePassed': 162, 'packageSkippedInLog': 0,
            'nodeGates': {'cases': 8, 'finalNineStable': True, 'context': nc_before['context'],
                          'receiptWriterCorrection': na['receiptCorrection']},
            'finalControls': {'passed': 1, 'deliberateFailure': 1, 'originalGCRequests': 6,
                              'snapshotRequests': 1, 'successDiagnostics': 0, 'finalNineStable': True,
                              'primitiveContext': context},
            'positiveHeap': positive, 'cleanup': cleanup}


def main():
    folder = Path(__file__).resolve().parent
    index = json.loads((folder / 'index.json').read_text())
    for key in ['archive', 'summary', 'verifier']:
        row = index[key]
        content = (folder / row['path']).read_bytes()
        assert len(content) == row['bytes'] and sha(content) == row['sha256']
    files = {}
    with tarfile.open(folder / index['archive']['path'], 'r:gz') as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            assert member.isfile() and not path.is_absolute() and '..' not in path.parts
            assert '.git' not in path.parts and 'node_modules' not in path.parts and member.name not in files
            files[member.name] = archive.extractfile(member).read()
    assert len(files) == index['payloadCount'] == 102
    assert set(files) == {r['path'] for r in index['files']}
    for row in index['files']:
        content = files[row['path']]
        assert len(content) == row['bytes'] and sha(content) == row['sha256']
    for prefix, count in [('author', 87), ('review', 15)]:
        original = json.loads(files[prefix + '/sha256-index.json'])
        original = original if isinstance(original, list) else original['files']
        assert len(original) + 1 == count
        assert {prefix + '/' + r['path'] for r in original} | {prefix + '/sha256-index.json'} == {name for name in files if name.startswith(prefix + '/')}
        for row in original:
            content = files[prefix + '/' + row['path']]
            assert len(content) == row['bytes'] and sha(content) == row['sha256']
    summary = json.loads((folder / 'summary.json').read_text())
    assert derive(files) == summary['independentChecks']
    assert verify_git(summary['localGitReadback'], files) == summary['verifiedCommitScope']
    assert summary['dependency'] == '#650 at877; production source unchanged only relative877, not master/8fb'
    print('Verified102 original members; M035 parents/tree/src650/nine files;all299inputs;1300/1181/162;Node8;primitivecontext/6GC+1snapshot/fixedfalse/ACK/cleanup;no remote result.')


if __name__ == '__main__':
    main()

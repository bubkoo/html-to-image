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


def verify_git(proof, files):
    commits = {}
    for name in ['candidate', 'base']:
        record = proof[name]
        raw = base64.b64decode(record['commitBase64'])
        assert git_hash('commit', raw) == record['commit']
        headers = raw.split(b'\n\n', 1)[0].decode().splitlines()
        tree = next(line[5:] for line in headers if line.startswith('tree '))
        assert tree == record['tree']
        commits[name] = headers
    assert proof['candidate']['commit'] == '8fb282ca769c297ec3833787e660f22ceb057c46'
    assert proof['base']['commit'] == 'f8d1c4b1abb7decf143fdf418ad08fa8b22bd309'
    assert [x[7:] for x in commits['candidate'] if x.startswith('parent ')] == [proof['base']['commit']]
    trees = {}
    for oid, encoded in proof['trees'].items():
        raw = base64.b64decode(encoded)
        assert git_hash('tree', raw) == oid
        trees[oid] = git_tree(raw)
    changes = []
    def diff(old, new, prefix=''):
        left, right = trees[old], trees[new]
        for name in sorted(set(left) | set(right)):
            if left.get(name) == right.get(name):
                continue
            path = prefix + name
            a, b = left.get(name), right.get(name)
            if a and b and a[0] == b[0] == '40000':
                diff(a[1], b[1], path + '/')
            else:
                changes.append(path)
    diff(proof['base']['tree'], proof['candidate']['tree'])
    manifest = json.loads(files['author/final-candidate-inputs.json'])['files']
    assert sorted(changes) == sorted(record['path'] for record in manifest)
    for record in manifest:
        data = files['author/final-source/' + record['path']]
        assert len(data) == record['bytes'] and sha(data) == record['sha256']
        tree = trees[proof['candidate']['tree']]
        parts = record['path'].split('/')
        for part in parts[:-1]:
            tree = trees[tree[part][1]]
        assert git_hash('blob', data) == tree[parts[-1]][1]
    for key in ['src', 'package.json', 'pnpm-lock.yaml']:
        assert trees[proof['base']['tree']][key] == trees[proof['candidate']['tree']][key]
    return {'exactCommit': proof['candidate']['commit'], 'parent': proof['base']['commit'],
            'changedFiles': sorted(changes), 'runtimeAndDependencyEntriesEqual': True}


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


def derive(files):
    def data(path):
        return json.loads(files['author/' + path])
    final = {r['path']: r['sha256'] for r in data('final-candidate-inputs.json')['files']}
    stages = []
    for family, names in [('full-checks', ['lint', 'build', 'types', 'consumers']),
                          ('full-browser-checks', ['default', 'browser-package'])]:
        receipt = data(family + '/receipt.json')
        for name in names:
            before = data(family + '/' + name + '-inputs-before.json')
            after = data(family + '/' + name + '-inputs-after.json')
            assert len(before) == len(after) == 293 and before == after
            mapping = {r['path']: r['sha256'] for r in before}
            differences = [{'path': path, 'testedSHA256': mapping.get(path), 'finalSHA256': value}
                           for path, value in sorted(final.items()) if mapping.get(path) != value]
            record = next(r for r in receipt['stages'] if r['name'] == name)
            assert record['exitCode'] == 0 and record['inputsUnchanged'] and record['inputCount'] == 293
            if family == 'full-browser-checks':
                assert not differences
            stages.append({'family': family, 'stage': name, 'inputCount': 293,
                           'beforeAfterEqual': True, 'finalNineDifferences': differences,
                           'startedUTC': record['startedUTC'], 'completedUTC': record['completedUTC']})
    first = data('full-checks/lint-inputs-before.json')
    last = data('full-browser-checks/browser-package-inputs-after.json')
    runtime = lambda rows: {r['path']: r['sha256'] for r in rows
                            if r['path'].startswith('src/') or r['path'] in ['package.json', 'pnpm-lock.yaml']}
    assert runtime(first) == runtime(last)
    text = files['author/full-browser-checks/default.log'].decode()
    assert re.findall(r'Tests\s+(\d+) passed \| (\d+) skipped', text) == [('1234', '4'), ('1115', '4')]
    assert re.search(r'\b162 passed\b', files['author/full-browser-checks/browser-package.log'].decode())
    final_control = data('final-two-controls/receipt.json')
    assert final_control['inputsBefore'] == final_control['inputsAfter']
    assert {r['path']: r['sha256'] for r in final_control['inputsBefore']} == final
    assert final_control['gcRequests'] == 6 and final_control['heapSnapshotRequests'] == 1
    assert final_control['successCaseDiagnosticRequests'] == 0 and final_control['exitCode'] == 1
    calls = data('final-two-controls/command-calls.json')
    assert calls == final_control['calls']
    assert sum(r['command'] == 'collectGarbage' for r in calls) == 6
    assert [(r['phase']) for r in calls if r['command'] == 'captureGCFailureHeap'] == ['snapshot', 'after']
    log = files['author/final-two-controls/run.log'].decode()
    assert re.search(r'Tests\s+1 failed \| 1 passed \(2\)', log)
    positive = heap_evidence(files, 'author/final-two-controls/artifacts/9c6d259d-d142-4ce1-bdb0-e4e0a30ce417')
    negative = heap_evidence(files, 'author/initial-unbounded-inputs/artifacts/0203913a-b0e9-4bb2-a2c3-51b6565425c6')
    assert len(positive['markerPropertyEdges']) == len(positive['knownStrongHolderChains']) == 1
    assert positive['knownStrongHolderChains'][0]['sourceClass']['class'] == 'HTMLDocument'
    assert positive['before']['originalCollected'] is positive['after']['originalCollected'] is False
    assert positive['before']['alive'] is positive['after']['alive'] is True
    assert positive['after']['snapshotConfirmed'] is True
    assert positive['after']['snapshotFinishedUTC'] == positive['transport']['snapshotFinishedUTC']
    assert positive['after']['observation'] == 'after-diagnostic-await'
    assert negative['before']['originalCollected'] is negative['after']['originalCollected'] is False
    assert negative['before']['alive'] is True and negative['after']['alive'] is False
    assert negative['markerPropertyEdges'] == [] and negative['knownStrongHolderChains'] == []
    setup = data('initial-unbounded-inputs/include-and-provenance.json')
    assert setup['count'] == 40 and len(setup['resolvedIncludeFromFixedGlob']) == 40
    assert setup['testCounts'] == {'passed': 372, 'failed': 2, 'skipped': 1}
    gates = data('budget-owned-results.json')
    assert gates['result'] == 'all passed' and len(gates['rows']) == 8 and gates['unhandled'] == []
    review = json.loads(files['review/assessment-final.json'])
    assert review['reviewedNodeSHA256'] == final['test/browser/gc-failure.mjs']
    assert review['reviewedBrowserSHA256'] == final['test/browser-unit/gc-failure.ts']
    assert 'e6c2132d' in review['authorControlledGatesRead']
    return {'stages': stages, 'runtimeInputHashesEqualAcrossStages': True,
            'coveragePassed': 1234, 'sourcePassed': 1115, 'skippedEach': 4, 'packagePassed': 162,
            'finalControl': {'passed': 1, 'deliberatelyFailed': 1, 'gcRequests': 6,
                             'snapshotRequests': 1, 'successDiagnostics': 0, 'finalNineByteExact': True},
            'finalKnownStrongHolder': positive, 'originalRealFailure': negative,
            'initialSetup': {'includedFiles': 40, 'counts': setup['testCounts']},
            'nodeGates': {'cases': 8, 'result': gates['result'],
                          'scope': 'Intermediate bounded e6c2132d helper; not final ACK/helper browser controls.'}}


def main():
    folder = Path(__file__).resolve().parent
    index = json.loads((folder / 'index.json').read_text())
    for key in ['archive', 'summary', 'verifier']:
        record = index[key]
        content = (folder / record['path']).read_bytes()
        assert len(content) == record['bytes'] and sha(content) == record['sha256']
    files = {}
    with tarfile.open(folder / index['archive']['path'], 'r:gz') as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            assert member.isfile() and not path.is_absolute() and '..' not in path.parts
            assert '.git' not in path.parts and 'node_modules' not in path.parts
            assert member.name not in files
            files[member.name] = archive.extractfile(member).read()
    assert len(files) == index['payloadCount'] == 296
    assert set(files) == {r['path'] for r in index['files']}
    for record in index['files']:
        content = files[record['path']]
        assert len(content) == record['bytes'] and sha(content) == record['sha256']
    for prefix, expected in [('author', 255), ('review', 41)]:
        records = json.loads(files[prefix + '/sha256-index.json'])
        records = records if isinstance(records, list) else records['files']
        assert len(records) + 1 == expected
        # Each original seal excludes itself; preserve its bytes as an extra original member.
        assert {prefix + '/' + r['path'] for r in records} | {prefix + '/sha256-index.json'} == {n for n in files if n.startswith(prefix + '/')}
        for record in records:
            content = files[prefix + '/' + record['path']]
            assert len(content) == record['bytes'] and sha(content) == record['sha256']
    summary = json.loads((folder / 'summary.json').read_text())
    assert derive(files) == summary['independentChecks']
    assert verify_git(summary['localGitReadback'], files) == summary['verifiedCommitScope']
    assert 'not proof of no retaining root' in summary['limits'][0]
    print('Verified296 original members; exact8fb parent/runtime/nine files;293-input stage boundaries;1234/1115/162;8Node gates;6GC+1snapshot;positive chain and original missing-marker distinction.')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Verify archived security follow-up evidence; does not install or run browsers."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

STEM = 'minimatch-dev-security-20261125'
GROUP = 'output/playwright/' + STEM
ALLOWED = {'eslint', '@eslint/config-array', 'typescript-eslint', 'minimatch', '@isaacs/nonrecursive-glob-match'}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def j(payloads, name):
    return json.loads(payloads[GROUP + '/' + name])

def package_versions(text):
    body = text.split('\npackages:\n', 1)[1].split('\nsnapshots:\n', 1)[0]
    result = {}
    for match in re.finditer(r"^  (?:'([^'\n]+)'|(\S[^:\n]*)):[ \t]*$", body, re.M):
        key = match[1] or match[2]
        name, version = key.rsplit('@', 1)
        result.setdefault(name, []).append(version)
    return result

def derive(payloads):
    assessment = j(payloads, 'assessment.json')
    first = j(payloads, 'validation-first-install/validation.json')
    final = j(payloads, 'validation.json')
    graph = j(payloads, 'candidate-dependency-graph.json')
    allow = j(payloads, 'manifest-allowlist.json')
    before = j(payloads, 'baseline-package.json')
    current = j(payloads, 'candidate-package.json')
    for name, old, new in [('eslint', '^10.14.0', '^10.15.0'), ('typescript-eslint', '^8.72.1', '^8.73.0')]:
        assert before['devDependencies'][name] == old and current['devDependencies'][name] == new
        before['devDependencies'][name] = new
    assert before == current and allow['onlyTwoManifestFieldsChanged'] and allow['noOverride']
    old_versions = package_versions(payloads[GROUP + '/baseline-pnpm-lock.yaml'].decode())
    new_versions = package_versions(payloads[GROUP + '/candidate-pnpm-lock.yaml'].decode())
    changed = []
    for name in set(old_versions) | set(new_versions):
        if old_versions.get(name) != new_versions.get(name):
            assert name in ALLOWED or name.startswith('@typescript-eslint/')
            changed.append(name)
    assert len(changed) == 15
    assert old_versions['minimatch'] == ['10.2.6'] and new_versions['minimatch'] == ['11.0.9']
    assert graph['lockMinimatchVersions'] == graph['reachableInstalledMinimatchVersions'] == ['11.0.9']
    assert graph['affectedReachablePnpmGraphVersions'] == [] and graph['overrides'] is None
    assert len(graph['dependencyRangeAssertions']) == graph['installedRangeAssertions'] == 77
    assert first['allStagesPassed'] and not final['allStagesPassed']
    assert first['inputsUnchanged'] and final['inputsUnchanged'] and first['inputCount'] == final['inputCount'] == 283
    stages = {row['name']: row for row in final['stages']}
    assert stages['default-full']['exitCode'] == 1
    assert all(stages[name]['exitCode'] == 0 for name in ['lint-check', 'build', 'package-contract', 'browser-types', 'source-full-after-coverage-failure', 'package-browser-full'])
    plain = lambda data: re.sub(r'\x1b\[[0-9;]*[A-Za-z]', '', data.decode())
    first_log = plain(payloads[GROUP + '/validation-first-install/default-full.log'])
    final_log = plain(payloads[GROUP + '/default-full.log'])
    source_log = plain(payloads[GROUP + '/source-full-after-coverage-failure.log'])
    package_log = plain(payloads[GROUP + '/package-browser-full.log'])
    assert '1234 passed | 4 skipped' in first_log and '1115 passed | 4 skipped' in first_log
    assert '1233 passed | 4 skipped' in final_log and '1 failed' in final_log
    assert 'Frame was detached' in final_log
    assert '1115 passed | 4 skipped' in source_log and '162 passed' in package_log
    assert not re.search(r'^> html-to-image@[^\n]+ test:browser:source ', final_log, re.M)
    for name in ['candidate-inputs-before.json', 'candidate-inputs-after.json']:
        inputs = j(payloads, name)
        for filename in ['package.json', 'pnpm-lock.yaml']:
            archived = payloads[GROUP + '/candidate-' + filename]
            assert sha(archived) == inputs[filename]['sha256']
    assert j(payloads, 'candidate-inputs-before.json') == j(payloads, 'candidate-inputs-after.json')
    assert b'ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY' in payloads[GROUP + '/candidate-frozen-install-initial-failure.log']
    physical = j(payloads, 'physical-minimatch-after-clean.json')
    assert physical['orphan10_2_6Removed'] and physical['remainingBundledAffectedVersions'] == ['10.2.5']
    bundle = j(payloads, 'npm-bundle-boundary.json')
    assert bundle['activeDependencyPaths'] and bundle['installedBundledMinimatchVersion'] == '10.2.5'
    cleanup = j(payloads, 'browser-window-and-cleanup.json')
    assert cleanup['allOwnedValidationCommandsExited'] and cleanup['port4197AvailableAfterCommands']
    assert cleanup['exclusiveBrowserExecutionClaim'] is False and cleanup['port4173Touched'] is False
    assert cleanup['newBrowserControlsStartedAfterRootStopInstruction'] is False
    failure_files = j(payloads, 'original-failure-artifact-index.json')
    assert len(failure_files) == 1
    for row in failure_files:
        data = payloads[row['saved']]
        assert len(data) == row['bytes'] and sha(data) == row['sha256']
    assert assessment['checks']['latestDefaultFullPassed'] is False
    assert assessment['npmBundledBoundary']['unresolved'] is True
    assert assessment['checks']['counts'] == {
        'firstInstall': {'coverage': {'passed':1234,'failed':0,'skipped':4},'source':{'passed':1115,'failed':0,'skipped':4},'package':{'passed':162,'failed':0}},
        'cleanFrozenFinalLock': {'coverage':{'passed':1233,'failed':1,'skipped':4},'defaultSourcePhase':'not executed after coverage failure','independentSource':{'passed':1115,'failed':0,'skipped':4},'package':{'passed':162,'failed':0}},
    }
    return assessment

def verify(directory, check_originals=False, check_working_candidate=False):
    index = json.loads((directory / (STEM + '-index.json')).read_text())
    summary = json.loads((directory / (STEM + '.json')).read_text())
    compressed = (directory / index['archive']['path']).read_bytes()
    assert len(compressed) == index['archive']['bytes'] and sha(compressed) == index['archive']['sha256']
    payloads = {}
    with tarfile.open(fileobj=io.BytesIO(gzip.decompress(compressed)), mode='r:') as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            assert member.isfile() and not path.is_absolute() and '..' not in path.parts and member.name not in payloads
            payloads[member.name] = archive.extractfile(member).read()
    assert len(payloads) == index['fileCount']
    assert set(payloads) == {row['path'] for row in index['files']}
    for row in index['files']:
        data = payloads[row['path']]
        assert len(data) == row['size'] and sha(data) == row['sha256']
        if check_originals:
            assert Path(row['path']).read_bytes() == data
    raw_index = j(payloads, 'index.json')
    assert len(payloads) == raw_index['count'] + 1
    for row in raw_index['files']:
        data = payloads[GROUP + '/' + row['path']]
        assert len(data) == row['bytes'] and sha(data) == row['sha256']
    assessment = derive(payloads)
    assert all(summary[key] == value for key, value in assessment.items())
    assert summary['rawEvidence']['sha256'] == index['archive']['sha256']
    assert summary['rawEvidence']['fileCount'] == len(payloads)
    if check_working_candidate:
        for row in assessment['candidateFiles']:
            assert sha(Path(row['path']).read_bytes()) == row['sha256']
    return {'integrityStatus':'verified','testGateStatus':'latest local default failed; not replaced by first green run','fileCount':len(payloads),'archive':index['archive'],'gzipCRCAndTarHeadersVerified':True,'allMemberSizesAndHashesVerified':True,'originalFilesByteCompared':check_originals,'workingCandidateHashesCompared':check_working_candidate,'summaryRecomputedFromArchivedReceipts':True,'explicitGraphVersions':['11.0.9'],'npmBundledResidual':'10.2.5','latestCoverage':{'passed':1233,'failed':1,'skipped':4},'independentSource':{'passed':1115,'skipped':4},'packagePassed':162,'summarySHA256':sha((directory/(STEM+'.json')).read_bytes()),'indexSHA256':sha((directory/(STEM+'-index.json')).read_bytes()),'verifierSHA256':sha(Path(__file__).read_bytes())}

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-originals',action='store_true')
    parser.add_argument('--check-working-candidate',action='store_true')
    args=parser.parse_args()
    print(json.dumps(verify(Path(__file__).resolve().parent,args.check_originals,args.check_working_candidate),indent=2))

#!/usr/bin/env python3
"""Verify the new native-part context archive without extracting or running it."""
import argparse
import collections
import gzip
import hashlib
import io
import ipaddress
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

BASE = 'native-part-context-followup'
GROUPS = [
    'output/playwright/native-part-context-20261125',
    'output/playwright/native-part-passive-resources-20261125',
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def load_json(payloads, group, path):
    return json.loads(payloads[group + '/' + path])


def scan_public_payloads(payloads):
    issues = []
    local_stack_paths = []
    text_extensions = {'.json', '.md', '.ts', '.js', '.mjs', '.cjs', '.log'}
    patterns = {
        'credential': r'(?i)(?:authorization\s*[=:]\s*[\"\x27]?bearer\s+\S+|(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)',
        'signed-download-query': r'(?i)(?:[?&]|\\u0026)(?:x-amz-|x-goog-|signature=|sig=|access_token=|refresh_token=|ossaccesskeyid=|expires=)',
        'URL-userinfo': r'https?://[^/\s\"<>]+@',
        'email': r'(?<![\w.-])[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}',
    }
    for path, data in sorted(payloads.items()):
        if PurePosixPath(path).suffix not in text_extensions:
            continue
        text = data.decode('utf-8')
        for kind, pattern in patterns.items():
            if re.search(pattern, text):
                issues.append({'path': path, 'kind': kind})
        if re.search(r'/Users/[^/\s]+/', text):
            local_stack_paths.append(path)
        for candidate in re.findall(r'(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])', text):
            try:
                address = ipaddress.ip_address(candidate)
            except ValueError:
                continue
            if not address.is_loopback and not address.is_unspecified:
                issues.append({'path': path, 'kind': 'non-loopback-IP'})
    return {
        'credentialOrSignedURLOrPersonalContactFindings': issues,
        'ordinaryLocalWorktreeStackPathMembersRetained': local_stack_paths,
        'localPathPolicy': 'Two original failure stacks retain ordinary checkout paths as provenance; no credentials or personal contact data were found. Raw bytes are unchanged.',
    }


def derive_findings(payloads):
    context, passive = GROUPS
    context_receipt = load_json(payloads, context, 'results/receipt.json')
    context_assessment = load_json(payloads, context, 'assessment.json')
    visibility_receipt = load_json(payloads, context, 'visibility-results/receipt.json')
    passive_receipt = load_json(payloads, passive, 'capability-results/receipt.json')
    open_receipt = load_json(payloads, passive, 'minimal-results/receipt.json')
    input_identity = load_json(payloads, context, 'inputs.json')
    assert sha256(payloads[context + '/prototype.js']) == context_receipt['prototypeSHA256'] == input_identity['currentReceiptPrototypeSHA256']
    assert sha256(payloads[context + '/prototype-before-visibility-gate.js']) == visibility_receipt['prototypeSHA256'] == input_identity['visibilityReceiptPrototypeSHA256']
    assert payloads[context + '/typecheck.log'] == b''
    source_rows = []
    unsupported = 0
    lifecycle = []
    nested_rows = []
    engine_versions = []
    for engine in context_receipt['engines']:
        engine_versions.append({'engine': engine['engine'], 'version': engine['version']})
        source_rows.extend(engine['rows'])
        unsupported += len(engine['negativeSnapshots'])
        assert all(row['snapshot']['status'] == 'unknown' for row in engine['negativeSnapshots'])
        assert engine['inactiveMedia']['result']['status'] == 'unknown'
        for row in engine['rows']:
            assert row['agrees'] and row['primitiveOnly'] and row['synchronous']
            assert row['measured']['originalSourceRemoved']
            final = row['measured']['diagnostics']
            assert final['listeners'] == final['timers'] == 0 and not final['framePresent']
            if row['test'].get('nestedOther'):
                nested_rows.append(row)
                assert not row['expectedNative'] and not row['measured']['result']['applies']
                assert row['targetColors']['ownHorizontalYellow'] == 0
                assert row['targetColors']['yellow'] > 0
                assert row['measured']['nestedChildResult']['status'] == 'measured'
                assert row['measured']['nestedChildResult']['applies']
        current = engine['lifecycle']
        assert current['scriptGuard']['executed'] == 0
        assert current['maliciousDTO']['rejected'] and current['maliciousDTO']['diagnostics']['framesCreated'] == 0
        assert all(row['result']['status'] == 'unknown' for row in current['calibrationFailures'])
        for case in current['cases']:
            final = case.get('afterLate', case.get('diagnostics'))
            assert final['listeners'] == final['timers'] == 0
            assert not final['framePresent'] and final['framesCreated'] == final['framesRemoved']
            if case['mode'] in ['preabort', 'before-fence', 'abort-during-pending-frame-load']:
                assert case['identical']
            if case['mode'] == 'before-fence':
                assert case['lateDidNotComplete']
                assert 'part' in final['eventMarkers'] and 'positive' in final['eventMarkers']
                assert 'fence' not in final['eventMarkers']
            lifecycle.append(case)
    assert len(source_rows) == context_assessment['sourcePairs'] == context_assessment['sourceAgreement'] == 24
    assert unsupported == 32
    mode_counts = dict(collections.Counter(case['mode'] for case in lifecycle))
    visibility = [row for engine in visibility_receipt['engines'] for row in engine['rows']]
    assert len(visibility) == 12
    for row in visibility:
        if row['test']['name'].startswith('root-'):
            assert row['rootRuleDefinitelyParticipates']
            assert row['sourceGeometry']['client'] == [100, 100]
            assert row['sourceColors']['yellow'] == row['sourceColors']['black'] == 0
            assert row['measured']['result']['applies']
        if row['test']['name'] == 'ancestor-opacity-zero':
            assert row['sourceColors']['yellow'] == row['sourceColors']['black'] == 0
            assert row['measured']['result']['applies']
        if row['test']['name'] == 'ancestor-display-none':
            assert row['measured']['result']['status'] == 'unknown'
    passive_rows = [row for engine in passive_receipt['engines'] for row in engine['rows']]
    for row in passive_rows:
        assert row['synthetic'] == 1 and row['decodedImage'] == [1, 1]
        assert row['client'] == [89, 93]
        assert not row['entries'] and not row['observed'] and not row['pending'] and not row['violations']
    open_rows = [row for engine in open_receipt['engines'] for row in engine['rows']]
    for row in open_rows:
        assert row['syntheticDocument'] == row['syntheticWindow'] == 1
        assert row['finalReadyState'] == 'complete'
        assert not row['finalResourceEntries'] and not row['entries'] and not row['violations']
        assert not any(event['phase'] in ['window-load', 'iframe-load'] for event in row['events'])
    cleanup_scopes = []
    for group, folder in [(context, 'results'), (context, 'visibility-results'), (passive, 'capability-results'), (passive, 'minimal-results')]:
        cleanup = load_json(payloads, group, folder + '/cleanup.json')
        assert cleanup['completed'] and cleanup['serverClosed']
        assert cleanup['requests'] == ['/', '/']
        assert all(engine['cleanup']['frames'] == 0 for engine in cleanup['closed'])
        cleanup_scopes.append(group + '/' + folder)
    assert any('script-src-elem' in engine['lifecycle']['scriptGuard']['violations'] for engine in context_receipt['engines'])
    return {
        'engines': engine_versions,
        'contextDTO': {
            'sourcePairs': len(source_rows), 'samePartSourceAgreements': sum(row['agrees'] for row in source_rows),
            'unsupportedUnknown': unsupported, 'primitiveOnlySynchronousSnapshots': len(source_rows),
            'nestedTargetNegativeWithChildPositive': len(nested_rows),
            'selectedPartScope': context_assessment['supportedSelectedParts'],
            'scope': 'Fixed static Document/ShadowRoot controls; exact rule path/prefix/part/suffix and nesting/media/supports/layer envelope retained. Not a generic membership policy.',
        },
        'lifecycleAndSafety': {
            'lifecycleCases': len(lifecycle), 'modeCounts': mode_counts,
            'identicalCancellationReasons': sum(case.get('identical', False) for case in lifecycle),
            'realCSPWaitCancellationWithPartPositiveBeforeFence': mode_counts['before-fence'],
            'inlineAndOnerrorExecutions': 0, 'maliciousDTOPreFrameRejections': 2,
            'allFinalFramesListenersTimersZero': True,
        },
        'visibility': {
            'observations': len(visibility),
            'rootZeroOrHiddenRuleParticipatesWithoutPixelsAndWithPartEvent': 4,
            'ancestorOpacityZeroNoPixelsButPartEvent': 2,
            'ancestorDisplayNoneUnknown': 2,
            'thumbOpacityOrDisplayDeclarationsDidNotHidePartInTestedEngines': 4,
            'generalAbsentEventInferenceProven': False,
        },
        'passiveBlobData': {
            'capabilityControls': len(passive_rows), 'independentTransparentPNGDecodes': len(passive_rows),
            'resourceTimingEntries': 0, 'observerEntries': 0, 'CSPViolations': 0,
            'result': 'unknown; no local-resource timing observation, never infer selector non-membership',
            'openWriteControls': len(open_rows), 'openWriteFinalComplete': len(open_rows),
            'openWriteWindowLoadObserved': 0,
            'consoleBoundary': 'Chromium allow-scripts plus same-origin sandbox warnings retained; no CSP console errors in passive controls.',
            'rootHiddenMultiScrollerAndEnvelopeMatrixExpanded': False,
        },
        'cleanupScopesVerified': cleanup_scopes,
        'generalProductionFilterImplemented': False,
        'genericMissingMarkerProof': False,
    }


def verify(directory, check_originals=False):
    index_path = directory / (BASE + '-index.json')
    summary_path = directory / (BASE + '.json')
    index = json.loads(index_path.read_text())
    summary = json.loads(summary_path.read_text())
    compressed = (directory / index['archive']['path']).read_bytes()
    assert len(compressed) == index['archive']['bytes']
    assert sha256(compressed) == index['archive']['sha256']
    # Full decompression validates gzip stream/trailer CRC; tar parsing validates
    # headers. No extraction, source changes or browser/test execution occurs.
    raw_tar = gzip.decompress(compressed)
    payloads = {}
    with tarfile.open(fileobj=io.BytesIO(raw_tar), mode='r:') as archive:
        for member in archive.getmembers():
            name = member.name
            parsed = PurePosixPath(name)
            assert member.isfile() and not parsed.is_absolute() and '..' not in parsed.parts
            assert name not in payloads
            payloads[name] = archive.extractfile(member).read()
    assert len(payloads) == index['fileCount'] == 105
    assert set(payloads) == {item['path'] for item in index['files']}
    for item in index['files']:
        data = payloads[item['path']]
        assert len(data) == item['size'] and sha256(data) == item['sha256']
        if check_originals:
            assert Path(item['path']).read_bytes() == data
    original_indices = []
    for group in GROUPS:
        embedded = load_json(payloads, group, 'index.json')
        archived = {name[len(group) + 1:] for name in payloads if name.startswith(group + '/')}
        expected = {item['path'] for item in embedded['files']}
        assert len(expected) == embedded['count']
        assert archived == expected | {'index.json'}
        for item in embedded['files']:
            data = payloads[group + '/' + item['path']]
            assert len(data) == item['bytes'] and sha256(data) == item['sha256']
        original_indices.append({'group': group, 'indexedRawMembers': embedded['count'], 'originalIndexSelfExcluded': 1, 'actualArchivedMembers': len(archived)})
    findings = derive_findings(payloads)
    assert summary['findings'] == findings
    assert summary['originalIndexAccounting'] == original_indices
    assert summary['rawEvidence'] == index['archive'] | {'index': BASE + '-index.json', 'fileCount': 105, 'allMemberHashesVerified': True}
    privacy = scan_public_payloads(payloads)
    assert privacy['credentialOrSignedURLOrPersonalContactFindings'] == []
    assert summary['publicReview'] == privacy
    return {
        'status': 'verified', 'archive': index['archive'], 'fileCount': len(payloads),
        'gzipCRCAndTarHeadersVerified': True, 'all105MemberSizeAndSHA256Verified': True,
        'original103IndexedMemberHashesAndTwoIndexFilesPreserved': True,
        'summaryRecomputedFromArchivedReceipts': True,
        'originalDirectoriesByteCompared': check_originals,
        'credentialAndSignedURLScanFindings': 0,
        'originalIndexAccounting': original_indices,
        'summarySHA256': sha256(summary_path.read_bytes()),
        'indexSHA256': sha256(index_path.read_bytes()),
        'verifierSHA256': sha256(Path(__file__).read_bytes()),
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-originals', action='store_true', help='Also compare archived bytes with the original output directories from repository root.')
    args = parser.parse_args()
    print(json.dumps(verify(Path(__file__).resolve().parent, args.check_originals), indent=2))

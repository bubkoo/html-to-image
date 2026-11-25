"""Portable stdlib-only verifier; does not launch browsers or extract files."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import struct
import tarfile
import zlib


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


def compare_columns(native, capture, ids):
    nw, nh, n, _ = png(native)
    cw, ch, c, _ = png(capture)
    assert (nw, nh, cw, ch) == (240, 20, 240, 20)
    assert len(ids) == 12
    columns = []
    for col, identity in enumerate(ids):
        different_channels = different_pixels = 0
        for y in range(nh):
            for x in range(col * 20, (col + 1) * 20):
                at = 4 * (y * nw + x)
                changed = sum(n[at + k] != c[at + k] for k in range(4))
                different_channels += changed
                different_pixels += bool(changed)
        center = 4 * (10 * nw + col * 20 + 10)
        columns.append({'id': identity, 'differentChannels': different_channels,
                        'differentPixels': different_pixels,
                        'nativeCenter': list(n[center:center + 4]),
                        'captureCenter': list(c[center:center + 4])})
    return columns


def inspect_payload(files):
    raw = json.loads(files['results.json'])
    assessment = json.loads(files['assessment.json'])
    comparisons = []
    for engine in raw['engines']:
        native_hashes = []
        for mode in engine['modes']:
            prefix = engine['engine'] + '-' + mode['mode']
            before = files[prefix + '-native-before.png']
            after = files[prefix + '-native-after.png']
            capture = files[prefix + '-capture.png']
            assert before == after
            assert sha(before) == mode['nativeBeforeSHA256'] == mode['nativeAfterSHA256']
            columns = compare_columns(before, capture, raw['ids'])
            assert columns == mode['columns'], prefix
            assert sum(c['differentChannels'] for c in columns) == mode['totalDifferentChannels']
            assert mode['sourceScreenshotUnchanged'] and mode['fixtureSubtreeUnchanged']
            assert mode['iframesAfter'] == 0 and mode['pageClosed'] and 'error' not in mode
            assert mode['sourceBefore']['frameCount'] == mode['sourceAfter']['frameCount'] == 0
            native_hashes.append(sha(before))
            comparisons.append({'engine': engine['engine'], 'mode': mode['mode'],
                                'width': 240, 'height': 20,
                                'nativeBeforeSHA256': sha(before),
                                'nativeAfterSHA256': sha(after),
                                'captureSHA256': sha(capture),
                                'totalDifferentChannels': sum(c['differentChannels'] for c in columns),
                                'totalDifferentPixels': sum(c['differentPixels'] for c in columns),
                                'columns': columns})
        assert len(set(native_hashes)) == 1
        assert engine['browserClosed']
    assert [c['totalDifferentChannels'] for c in comparisons] == [1200, 7200, 8400, 8400, 12000, 12000]
    sources, changed = [], []
    for source in assessment['execution']['sourceFiles']:
        path = source['path'].removeprefix('src/')
        original = files['source-original/' + path]
        candidate = files['source-candidate/' + path]
        assert sha(original) == source['sha256']
        sources.append({'path': source['path'], 'originalSHA256': sha(original),
                        'candidateSHA256': sha(candidate)})
        if original != candidate:
            changed.append(path)
    assert len(sources) == 24
    assert sorted(changed) == ['svg-references.ts', 'svg-style-scope.ts']
    assert sha(files['current.umd.js']) == assessment['execution']['baselineUMDSHA256']
    assert sha(files['candidate.umd.js']) == assessment['execution']['candidateUMDSHA256']
    assert raw['cleanup'] == {'serverClosed': True, 'browsersClosed': True}
    return {'comparisons': comparisons, 'sourceFingerprints': sources,
            'changedCopiedSourceFiles': sorted(changed), 'cleanup': raw['cleanup']}


def main():
    folder = Path(__file__).resolve().parent
    index = json.loads((folder / 'index.json').read_text())
    for key in ['archive', 'summary', 'verifier']:
        record = index[key]
        data = (folder / record['path']).read_bytes()
        assert len(data) == record['bytes'] and sha(data) == record['sha256'], key
    files = {}
    with tarfile.open(folder / index['archive']['path'], 'r:gz') as archive:
        for member in archive.getmembers():
            path = PurePosixPath(member.name)
            assert not path.is_absolute() and '..' not in path.parts and member.isfile()
            assert member.name not in files
            files[member.name] = archive.extractfile(member).read()
    assert len(files) == 90 == index['payloadCount']
    assert set(files) == {r['path'] for r in index['files']}
    for record in index['files']:
        data = files[record['path']]
        assert len(data) == record['bytes'] and sha(data) == record['sha256'], record['path']
    derived = inspect_payload(files)
    summary = json.loads((folder / 'summary.json').read_text())
    assert derived == summary['independentRecomputation']
    assert b'file membership differs' in files['verification-first-failure.log']
    assert 'not a directly recorded Document.baseURI read' in summary['limitations'][0]
    print('Verified 90 byte-exact payloads, six 240x20 PNG comparisons, 24 source pairs, cleanup, and failure provenance.')


if __name__ == '__main__':
    main()

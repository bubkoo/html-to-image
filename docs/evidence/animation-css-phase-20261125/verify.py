#!/usr/bin/env python3
"""Verify this CSS-only phase-freeze evidence using Python stdlib, no browser.

Usage: python3 verify.py [publication-directory]
Reads summary.json, index.json and raw.tar.gz next to this script by default.
Checks every archived original SHA256, PNG chunk CRC/filter reconstruction,
exact RGBA channel differences, case identity/counts and explicit invalid boundary.
"""
import binascii
import hashlib
import json
from pathlib import Path
import struct
import sys
import tarfile
import xml.etree.ElementTree as ET
import zlib


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def png(data):
    require(data[:8] == b'\x89PNG\r\n\x1a\n', 'Bad PNG signature')
    pos, chunks, image_data = 8, [], bytearray()
    while pos < len(data):
        require(pos + 12 <= len(data), 'Truncated PNG chunk')
        size = struct.unpack_from('>I', data, pos)[0]
        tag = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + size]
        require(len(body) == size and pos + 12 + size <= len(data), 'Truncated PNG body')
        crc = struct.unpack_from('>I', data, pos + 8 + size)[0]
        require(binascii.crc32(tag + body) & 0xffffffff == crc, 'PNG CRC mismatch')
        chunks.append(tag)
        if tag == b'IHDR':
            width, height, depth, color, comp, filt, interlace = struct.unpack('>IIBBBBB', body)
            require(depth == 8 and color in (2, 6) and (comp, filt, interlace) == (0, 0, 0),
                    'Only actual RGB8/RGBA8 noninterlaced evidence PNGs are accepted')
        elif tag == b'IDAT':
            image_data.extend(body)
        pos += size + 12
        if tag == b'IEND':
            break
    require(chunks[0] == b'IHDR' and chunks[-1] == b'IEND' and pos == len(data), 'PNG chunk structure')
    bpp = 3 if color == 2 else 4
    stride = width * bpp
    raw = zlib.decompress(image_data)
    require(len(raw) == height * (stride + 1), 'PNG scanline length')
    rgba, previous, cursor = bytearray(), bytearray(stride), 0
    for _ in range(height):
        kind = raw[cursor]
        cursor += 1
        row = bytearray(raw[cursor:cursor + stride])
        cursor += stride
        require(kind in range(5), 'Unknown PNG filter')
        for i in range(stride):
            left = row[i - bpp] if i >= bpp else 0
            up = previous[i]
            upper_left = previous[i - bpp] if i >= bpp else 0
            if kind == 0:
                predictor = 0
            elif kind == 1:
                predictor = left
            elif kind == 2:
                predictor = up
            elif kind == 3:
                predictor = (left + up) // 2
            else:
                p = left + up - upper_left
                a, b, c = abs(p - left), abs(p - up), abs(p - upper_left)
                predictor = left if a <= b and a <= c else up if b <= c else upper_left
            row[i] = (row[i] + predictor) & 255
        if bpp == 4:
            rgba.extend(row)
        else:
            for i in range(0, len(row), 3):
                rgba.extend(row[i:i + 3])
                rgba.append(255)
        previous = row
    return (width, height), bytes(rgba)


def main():
    directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent
    index = json.loads((directory / 'index.json').read_text())
    summary = json.loads((directory / 'summary.json').read_text())
    archive = directory / 'raw.tar.gz'
    require(archive.stat().st_size == index['archive']['bytes'], 'Archive byte count')
    require(sha(archive.read_bytes()) == index['archive']['sha256'], 'Archive SHA256')
    for item in index['companionFiles']:
        data = (directory / item['path']).read_bytes()
        require(len(data) == item['bytes'] and sha(data) == item['sha256'], 'Companion SHA: ' + item['path'])
    expected = {item['path']: item for item in index['payloadFiles']}
    require(len(expected) == len(index['payloadFiles']), 'Duplicate index path')
    payload = {}
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        require(all(m.isfile() and m.name.startswith('raw/') and '..' not in Path(m.name).parts
                    and not Path(m.name).is_absolute() for m in members), 'Unsafe/non-file archive member')
        require(len(members) == len(expected) and {m.name for m in members} == set(expected), 'Exact allowlist mismatch')
        for member in members:
            data = tar.extractfile(member).read()
            item = expected[member.name]
            require(len(data) == item['bytes'] and sha(data) == item['sha256'], 'Original SHA: ' + member.name)
            payload[member.name[4:]] = data
    raw_index = json.loads(payload['sha256-index.json'])
    for item in raw_index['files']:
        data = payload[item['path']]
        require(len(data) == item['bytes'] and sha(data) == item['sha256'], 'Prior original index: ' + item['path'])
    results = json.loads(payload['results.json'])
    plan = json.loads(payload['plan.json'])
    require(plan == results['plan'] and plan['createdUTC'] <= results['startedUTC'], 'Predeclared matrix identity/time')
    engines = {'chromium', 'firefox', 'webkit'}
    numeric_modes = {'normal', 'pseudo-important', 'data-link-important', 'uri-identity',
                     'callback-transform', 'callback-transform-important', 'callback-delay',
                     'callback-delay-important', 'callback-append-important',
                     'imperative-updateTiming', 'imperative-setKeyframes'}
    wanted = {(e, m) for e in engines for m in numeric_modes | {'scroll-timeline'}}
    rows = results['cases']
    require(len(rows) == 36 and {(r['engine'], r['mode']) for r in rows} == wanted, 'Exact36 planned identities')
    numeric = [r for r in rows if r['mode'] in numeric_modes]
    require(len(numeric) == 33, 'Exact33 valid numeric cases')
    fail_modes = {'callback-delay': 400, 'callback-append-important': 400,
                  'imperative-updateTiming': 400, 'imperative-setKeyframes': 800}
    measured, decoded = [], {}
    for name, data in payload.items():
        if name.endswith('.png'):
            decoded[name] = png(data)
    for row in numeric:
        engine, mode, output = row['engine'], row['mode'], row['output']
        prefix = engine + '-' + mode
        require(output['before'] == output['after'] and row['sourceUnchanged'], 'Source mutation: ' + prefix)
        require(output['hrefsUnchanged'] and not row['http'] and not row['errors'], 'URI/resource invariant: ' + prefix)
        oracle_size, oracle = decoded[prefix + '-native.png']
        require(oracle_size == (40, 20), 'Oracle dimensions: ' + prefix)
        computed = {}
        for kind in ('baseline', 'phase'):
            size, pixels = decoded[prefix + '-' + kind + '.png']
            require(size == oracle_size, 'Image dimensions: ' + prefix)
            count = sum(a != b for a, b in zip(pixels, oracle))
            delta = max(abs(a - b) for a, b in zip(pixels, oracle))
            require(count == output[kind]['differentChannels'] and delta == output[kind]['maxDelta'],
                    'Independent PNG difference mismatch: ' + prefix + '/' + kind)
            computed[kind] = count
        original = payload[prefix + '-originalSVG.svg']
        phase = payload[prefix + '-phaseSVG.svg']
        require(sha(original) == output['originalSVGSHA256'] and sha(phase) == output['phaseSVGSHA256'],
                'Result SVG SHA: ' + prefix)
        a, b = ET.fromstring(original), ET.fromstring(phase)
        require(len(b) and b[0].tag == '{http://www.w3.org/2000/svg}style'
                and b[0].text.startswith('@layer phase_frozen{'), 'Only added phase layer expected: ' + prefix)
        require('animation-play-state:paused!important' in b[0].text
                and 'animation-delay:' + str(int(output['delayMS'])) + 'ms!important' in b[0].text,
                'Phase formula/declarations: ' + prefix)
        b.remove(b[0])
        require(ET.tostring(a) == ET.tostring(b), 'SVG changed beyond first phase STYLE: ' + prefix)
        hrefs = lambda root: [x.get('href') for x in root.iter() if x.tag.endswith('}link')]
        require(hrefs(a) == hrefs(b), 'Raw LINK URI changed: ' + prefix)
        expected_error = fail_modes.get(mode, 0)
        require(computed['phase'] == expected_error, 'Unexpected phase result: ' + prefix)
        if mode in ('callback-delay', 'callback-append-important'):
            require(computed['baseline'] == 0 and computed['phase'] == 400, 'New callback regression: ' + prefix)
        measured.append({'engine': engine, 'mode': mode, **computed})
    passed = sum(r['phase'] == 0 for r in measured)
    failed = sum(r['phase'] != 0 for r in measured)
    require((passed, failed) == (21, 12), 'Exact21/12 valid counts')
    boundary = [r for r in rows if r['mode'] == 'scroll-timeline']
    for row in boundary:
        if row['engine'] == 'firefox':
            require(row['source'].get('unsupported') and not row['sourceUnchanged'], 'Invalid FF harness boundary missing')
        else:
            time = row['source']['state']['currentTime']
            require(time['type'] == 'CSSUnitValue' and time['unit'] == 'percent' and time['value'] == 50,
                    'Typed scroll boundary missing')
            require(row['output'].get('rejected') and 'phase' not in row['output'], 'Typed time was coerced')
    require(all(not row['http'] for row in rows), 'Unexpected HTTP')
    require(all(x['closed'] for x in results['cleanup'].values()), 'Browser cleanup not recorded')
    require(json.loads(payload['candidate-inputs-before.json']) == json.loads(payload['candidate-inputs-after.json']),
            'Parked source/test input hashes changed')
    require(sha(payload['root-9c09.umd.js']) == results['bundleSHA256']
            == '9c090fc25401c32b55c80dce3acaa71c6a8e0dc538046b4abad67c584dccee1a', 'Frozen bundle identity')
    require(summary['validNumericCases'] == 33 and summary['exactMatches'] == passed and summary['failures'] == failed,
            'Summary counts inconsistent')
    print(json.dumps({'verified': True, 'payloadFiles': len(payload), 'decodedPNGs': len(decoded),
                      'validNumericCases': 33, 'exactMatches': passed, 'failures': failed,
                      'callbackNewRegressions': 6, 'typedScrollRejected': 2,
                      'firefoxUnsupportedInvalidHarnessExcluded': 1,
                      'noBrowserStarted': True}, indent=2))


if __name__ == '__main__':
    main()

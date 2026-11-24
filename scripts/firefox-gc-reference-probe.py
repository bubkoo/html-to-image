"""Branch-only, reversible probe for the pinned Playwright Firefox on Linux.

No application objects are unwrapped: the method receives an existing WeakRef.
All inspection happens after the test cached its original failed primary result.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse
import copy
import hashlib
import json
import os
import platform
import shutil
import subprocess


def sha(data):
    return hashlib.sha256(data).hexdigest()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("action", choices=["install", "restore"])
parser.add_argument("--output", default=".vitest/attachments/gc-reference-probe")
args = parser.parse_args()
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
executable = Path(subprocess.check_output([
    "node", "-e", "process.stdout.write(require('playwright').firefox.executablePath())"
], text=True))
omni = executable.parent / "omni.ja"
state = executable.parent / ".codex-gc-reference"
backup = state / "original-omni.ja"
manifest_path = state / "manifest.json"
expected_omni = "f975f204199e40fcb5a7545b44b90ca4e365c1344825c0a2248d1556b35951a3"

if args.action == "restore":
    if not manifest_path.exists():
        # An install/preflight failure must not hide the original CI failure.
        receipt = {"status": "not installed", "restored": False}
    else:
        manifest = json.loads(manifest_path.read_text())
        assert sha(backup.read_bytes()) == expected_omni, "Original backup changed"
        current = sha(omni.read_bytes())
        assert current in [expected_omni, manifest["patchedSHA256"]], "Unknown browser bytes; refuse overwrite"
        temporary = state / "restore-omni.ja"
        shutil.copyfile(backup, temporary)
        os.replace(temporary, omni)
        receipt = {"status": "restored", "restored": True, "sha256": sha(omni.read_bytes())}
    (output / "restore.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt))
    raise SystemExit(0)

assert platform.system() == "Linux", "This probe is pinned to Linux Firefox"
assert sha(omni.read_bytes()) == expected_omni, "Unexpected or already patched Firefox"
state.mkdir(exist_ok=True)
shutil.copyfile(omni, backup)
runtime_entry = "chrome/juggler/content/content/Runtime.js"
parent_entry = "chrome/juggler/content/components/Juggler.js"
handler_entry = "chrome/juggler/content/protocol/BrowserHandler.js"
expected = {
    runtime_entry: "1c937f34bddea816bc0c7877a89da456071f56232b45d92d1017f36649d9c401",
    parent_entry: "787be0f948bb4c0338a88bd14e943d82d87c028534a60475b1f0ff7771d67a3d",
    handler_entry: "8963a31c877509cde244bfb978910775c0d8bef0cf7d0a510aca12727a2bcfa5",
}
method_path = Path(__file__).with_name("firefox-gc-reference-method.txt")
method = method_path.read_text()
parent_method_path = Path(__file__).with_name("firefox-gc-reference-parent.txt")
parent_method = parent_method_path.read_text()
with ZipFile(backup) as original:
    original_bytes = {entry.filename: original.read(entry) for entry in original.infolist()}
    texts = {entry: original_bytes[entry].decode() for entry in expected}
    for entry, text in texts.items():
        assert sha(text.encode()) == expected[entry], "Unexpected Juggler source: " + entry
    runtime = texts[runtime_entry]
    needle = "  getObjectProperties(objectId) {"
    assert runtime.count(needle) == 1
    runtime = runtime.replace(needle, method + "\n" + needle)
    needle = "    const obj = this._remoteObjects.get(objectId);\n    for (const propertyName"
    replacement = """    const obj = this._remoteObjects.get(objectId);
    if (obj instanceof Debugger.Object) {
      let marked = false;
      try { marked = obj.getOwnPropertyDescriptor('__codexHeap')?.value === true; } catch (_) {}
      if (marked) return this._codexHeapPaths(obj).then(graph => [{name:'__codex_heap_paths',value:{value:JSON.stringify(graph)}}]);
    }
    for (const propertyName"""
    assert runtime.count(needle) == 1
    runtime = runtime.replace(needle, replacement)
    needle = "return {properties: executionContext.getObjectProperties(objectId)};"
    assert runtime.count(needle) == 1
    runtime = runtime.replace(needle, "return {properties: await executionContext.getObjectProperties(objectId)};")
    runtime += """
try {
  if (!Services.cpmm.__codexJitOptionsRecorded) {
    Services.cpmm.__codexJitOptionsRecorded = true;
    dump('codex-content-jit-options '+JSON.stringify(Components.utils.getJSTestingFunctions().getJitCompilerOptions())+'\\n');
  }
} catch (error) { dump('codex-content-jit-options-error '+String(error)+'\\n'); }
"""
    parent = texts[parent_entry] + "\n" + parent_method + """
Services.ppmm.addMessageListener('codex-heap-state', ({data}) => { const before=ChromeUtils.isDevToolsOpened(); if(data.action==='open')ChromeUtils.notifyDevToolsOpened();else if(data.action==='close')ChromeUtils.notifyDevToolsClosed(); return {before,after:ChromeUtils.isDevToolsOpened()}; });
dump('codex-jit-prefs '+JSON.stringify(Object.fromEntries(['javascript.options.blinterp','javascript.options.baselinejit','javascript.options.ion'].map(key=>[key,Services.prefs.getBoolPref(key)])))+'\\n');
"""
    handler = texts[handler_entry]
    pos = handler.index("    this._eventListeners = [", handler.index("async ['Browser.enable']"))
    handler = handler[:pos] + "    dump('codex-post-enable-jit-prefs '+JSON.stringify(Object.fromEntries(['javascript.options.blinterp','javascript.options.baselinejit','javascript.options.ion'].map(key=>[key,Services.prefs.getBoolPref(key)])))+'\\n');\n" + handler[pos:]
    replacements = {runtime_entry: runtime.encode(), parent_entry: parent.encode(), handler_entry: handler.encode()}
    patched = state / "patched-omni.ja"
    with ZipFile(patched, "w") as target:
        for entry in original.infolist():
            # ZipFile mutates ZipInfo.header_offset while writing. Keep the
            # source directory and its reads independent of the output archive.
            target.writestr(copy.copy(entry), replacements.get(entry.filename, original_bytes[entry.filename]))
    with ZipFile(patched) as target:
        assert target.testzip() is None
        for entry, data in original_bytes.items():
            assert target.read(entry) == replacements.get(entry, data)
    manifest = {
        "originalSHA256": expected_omni,
        "patchedSHA256": sha(patched.read_bytes()),
        "methodSHA256": sha(method_path.read_bytes()),
        "parentMethodSHA256": sha(parent_method_path.read_bytes()),
        "installerSHA256": sha(Path(__file__).read_bytes()),
        "originalSourceSHA256": expected,
        "patchedSourceSHA256": {entry: sha(data) for entry, data in replacements.items()},
        "executable": str(executable), "platform": platform.platform(),
        "guard": "Official paired notifyDevToolsOpened/Closed; no security guard removed",
        "observation": "Existing WeakRef only, after cached failure; original three requests/assertions unchanged",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    (output / "install.json").write_text(json.dumps(manifest, indent=2) + "\n")
    for entry, data in replacements.items():
        (output / ("patched-" + Path(entry).name)).write_bytes(data)
    os.replace(patched, omni)
print(json.dumps({"status": "installed", "sha256": manifest["patchedSHA256"]}))

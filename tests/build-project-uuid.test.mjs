import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const xcode = require('xcode');
// Resolve the actual consumer's dependency, not an unrelated top-level UUID copy.
const generatorRequire = createRequire(require.resolve('xcode'));
const uuid = generatorRequire('uuid');

test('Xcode UUID dependency rejects undersized external buffers for the advisory APIs', () => {
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  for (const run of [buffer => uuid.v3('fixture', namespace, buffer, 4),
    buffer => uuid.v5('fixture', namespace, buffer, 4), buffer => uuid.v6({}, buffer, 4)]) {
    assert.throws(() => run(new Uint8Array(8)), RangeError);
  }
  // The existing generator uses the unaffected v4 string API; it must stay CommonJS-compatible.
  assert.match(uuid.v4(), /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
});

test('actual Xcode project generator adds files/groups and round-trips without identifier corruption', t => {
  const directory = mkdtempSync(join(tmpdir(), 'freshtrack-xcode-uuid-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'fixture.pbxproj');
  writeFileSync(filename, `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 56;
  objects = { PBXGroup = {}; PBXFileReference = {}; PBXBuildFile = {}; };
  rootObject = 000000000000000000000001;
}
`);
  const project = xcode.project(filename).parseSync();
  const generated = new Set();
  for (let i = 0; i < 256; i++) {
    const id = project.generateUuid();
    assert.match(id, /^[A-F0-9]{24}$/);
    assert.equal(generated.has(id), false);
    generated.add(id);
  }
  const group = project.addPbxGroup(['Fixture.txt'], 'Fixture', 'Fixture');
  assert.match(group.uuid, /^[A-F0-9]{24}$/);
  writeFileSync(filename, project.writeSync());
  const reopened = xcode.project(filename).parseSync();
  const saved = reopened.hash.project.objects.PBXGroup[group.uuid];
  assert.equal(saved.name, 'Fixture');
  assert.equal(saved.children.length, 1);
  const childId = saved.children[0].value;
  assert.match(childId, /^[A-F0-9]{24}$/);
  assert.equal(reopened.hash.project.objects.PBXFileReference[childId].path, '"Fixture.txt"');
  assert.equal(Object.keys(reopened.hash.project.objects.PBXBuildFile).filter(id => /^[A-F0-9]{24}$/.test(id)).length, 1);
});

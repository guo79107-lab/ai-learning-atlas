import { readFile, writeFile, readdir, stat, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = 'dist/client';
const release = JSON.parse(await readFile('deploy/release.json', 'utf8'));
// Flatten only build assets in the publish directory; page URLs retain basePath.
if (release.basePath)
  await cp(
    path.join(root, release.basePath.slice(1), '_next'),
    path.join(root, '_next'),
    { recursive: true },
  );
const manifest = JSON.parse(
  await readFile('dist/server/vinext-prerender.json', 'utf8'),
);
const failures = manifest.routes.filter((r) => r.status !== 'rendered');
if (failures.length)
  throw new Error(`Unrendered routes: ${JSON.stringify(failures)}`);
for (const page of [
  'index',
  'explore',
  'review',
  'coach',
  ...Array.from({ length: 11 }, (_, i) => `learn/${i + 1}`),
])
  for (const ext of ['html', 'rsc']) await stat(`${root}/${page}.${ext}`);
const clientFiles = [];
async function listJs(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) await listJs(file);
    else if (file.endsWith('.js')) clientFiles.push(file);
  }
}
await listJs(`${root}/_next`);
const compatibilityId = JSON.parse(
  await readFile('deploy/release.json', 'utf8'),
).id;
let identityFound = false;
for (const file of clientFiles) {
  if ((await readFile(file, 'utf8')).includes(compatibilityId)) {
    identityFound = true;
    break;
  }
}
if (!identityFound)
  throw new Error('Release identity is not present in the built client');
const template = await readFile('deploy/nginx-template.conf', 'utf8');
await writeFile(
  'deploy/nginx-stage.conf',
  template.replaceAll('__COMPATIBILITY_ID__', compatibilityId),
);
const hashes = [];
async function walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(file);
    else
      hashes.push(
        `${createHash('sha256')
          .update(await readFile(file))
          .digest('hex')}  ${path.relative(root, file)}`,
      );
  }
}
await walk(root);
await writeFile(
  'deploy/SHA256SUMS',
  hashes.sort((a, b) => a.localeCompare(b)).join('\n') + '\n',
);
console.log(
  JSON.stringify(
    {
      renderedRoutes: manifest.routes.length,
      publicFiles: hashes.length,
      compatibilityId,
      output: root,
    },
    null,
    2,
  ),
);

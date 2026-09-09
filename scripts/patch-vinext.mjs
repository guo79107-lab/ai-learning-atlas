import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(
  await readFile('node_modules/vinext/package.json', 'utf8'),
);
if (pkg.version !== '1.0.0-beta.5')
  throw new Error(
    'Review the basePath prerender patch for this Vinext version',
  );
const file = 'node_modules/vinext/dist/build/prerender.js';
const old =
  '${renderPorts[renderRoundRobin++ % renderPorts.length]}${parsed.pathname}${parsed.search}';
const fixed =
  '${renderPorts[renderRoundRobin++ % renderPorts.length]}${config.basePath ?? ""}${parsed.pathname}${parsed.search}';
const code = await readFile(file, 'utf8');
if (!code.includes(fixed)) {
  if (code.split(old).length !== 2)
    throw new Error(
      'Unexpected Vinext prerender source; refusing an ambiguous patch',
    );
  await writeFile(file, code.replace(old, fixed));
}
console.log(
  'Vinext beta.5: basePath forwarded by the build-time prerender handler',
);

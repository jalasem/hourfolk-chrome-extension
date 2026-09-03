import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const releaseDir = path.join(root, 'release');
const manifest = JSON.parse(await readFile(path.join(distDir, 'manifest.json'), 'utf8'));

if (manifest.manifest_version !== 3) throw new Error('Store package must use Manifest V3.');
if (!manifest.name || !manifest.version || !manifest.description || !manifest.icons?.['128']) {
  throw new Error('Store package is missing required manifest metadata.');
}

async function assertProductionOutput(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await assertProductionOutput(file);
      continue;
    }
    if (!/\.(?:html|js|json|css)$/.test(entry.name)) continue;
    const contents = await readFile(file, 'utf8');
    if (/localhost:5173|CRXJS DEV MODE|\/@vite\/env/.test(contents)) {
      throw new Error(`Development-server reference found in ${path.relative(root, file)}.`);
    }
  }
}

await assertProductionOutput(distDir);
await mkdir(releaseDir, { recursive: true });
const archive = path.join(releaseDir, `hourfolk-${manifest.version}-chrome.zip`);
await rm(archive, { force: true });
const result = spawnSync('zip', ['-rq', archive, '.'], { cwd: distDir, stdio: 'inherit' });
if (result.status !== 0) throw new Error(`zip exited with status ${result.status ?? 'unknown'}.`);
console.log(`wrote ${path.relative(root, archive)}`);

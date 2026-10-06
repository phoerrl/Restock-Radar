import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = JSON.parse(readFileSync(new URL('../wrangler.json', import.meta.url), 'utf8'));
const built = JSON.parse(readFileSync(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
if (source.name !== built.name || source.d1_databases[0].database_id !== built.d1_databases?.[0]?.database_id) {
  throw new Error('Build configuration differs from the selected Worker/database. Run npm run build first.');
}
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
for (const args of [
  ['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.json'],
  ['deploy', '--config', 'dist/server/wrangler.json', '--keep-vars'],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: 'inherit', env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generatePushSecrets, pushSetup } from './cloudflare-push.mjs';

const source = JSON.parse(readFileSync(new URL('../wrangler.json', import.meta.url), 'utf8'));
const built = JSON.parse(readFileSync(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
if (source.name !== built.name || source.d1_databases[0].database_id !== built.d1_databases?.[0]?.database_id) {
  throw new Error('Build configuration differs from the selected Worker/database. Run npm run build first.');
}
const cliEnv = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' };
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
for (const args of [
  ['d1', 'migrations', 'apply', 'DB', '--remote', '--config', 'wrangler.json'],
  ['deploy', '--config', 'dist/server/wrangler.json', '--keep-vars'],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: cliEnv });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const list = spawnSync(process.execPath, [cli, 'secret', 'list', '--config', 'dist/server/wrangler.json', '--format', 'json'], {
  stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', env: cliEnv,
});
if (list.error) throw list.error;
if (list.status !== 0) process.exit(list.status ?? 1);
if (pushSetup(JSON.parse(list.stdout).map(secret => secret.name)) === 'create') {
  // Provision only once. Private keys travel through stdin, never argv, files or logs.
  const secrets = generatePushSecrets('https://restock-radar.phoerrl.workers.dev');
  const result = spawnSync(process.execPath, [cli, 'secret', 'bulk', '--config', 'dist/server/wrangler.json'], {
    input: JSON.stringify(secrets), stdio: ['pipe', 'inherit', 'inherit'], env: cliEnv,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  process.stdout.write('Production push secrets provisioned; no existing key was replaced.\n');
} else process.stdout.write('Existing production push secrets preserved.\n');

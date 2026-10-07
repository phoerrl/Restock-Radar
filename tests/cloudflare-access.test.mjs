import test from 'node:test';
import assert from 'node:assert/strict';
import { isRadarOwner, radarAccessResponse } from '../lib/cloudflare-access.ts';

const env = { RADAR_ADMIN_PASSWORD: 'synthetic-test-only-password' };
const request = (pathname='/', init={}) => new Request(`https://radar.test${pathname}`, init);
const basic = `Basic ${btoa(`admin:${env.RADAR_ADMIN_PASSWORD}`)}`;

test('public GET reads do not require administration credentials', async () => {
  for (const path of ['/', '/api/radar', '/api/signals', '/sw.js']) {
    assert.equal(await radarAccessResponse(request(path), env), null);
  }
});
test('all public write methods and MCP are protected', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    assert.equal((await radarAccessResponse(request('/api/radar', { method }), env)).status, 401);
  }
  assert.equal((await radarAccessResponse(request('/mcp'), env)).status, 401);
});
test('only the public device-specific push endpoint accepts anonymous POST', async () => {
  assert.equal(await radarAccessResponse(request('/api/push', {method:'POST',headers:{origin:'https://radar.test'}}), {}), null);
  assert.equal((await radarAccessResponse(request('/api/push', {method:'PUT'}), {})).status, 401);
  assert.equal((await radarAccessResponse(request('/api/push', {method:'POST',headers:{origin:'https://other.test'}}), {})).status, 403);
});
test('missing, weak, malformed and incorrect credentials fail closed', async () => {
  for (const bad of ['', 'Basic !!!', `Basic ${btoa('other:synthetic-test-only-password')}`, 'Bearer wrong']) {
    assert.equal(await isRadarOwner(request('/', { headers: { authorization: bad } }), env), false);
  }
  assert.equal(await isRadarOwner(request('/', { headers: { authorization: basic } }), {}), false);
  assert.equal(await isRadarOwner(request('/', { headers: { authorization: basic } }), { RADAR_ADMIN_PASSWORD: 'short' }), false);
});
test('owner credentials permit same-origin writes and service requests', async () => {
  for (const authorization of [basic, `Bearer ${env.RADAR_ADMIN_PASSWORD}`]) {
    assert.equal(await radarAccessResponse(request('/api/radar', {
      method: 'POST', headers: { authorization, origin: 'https://radar.test' },
    }), env), null);
  }
});
test('cross-origin writes remain forbidden for authenticated browsers', async () => {
  assert.equal((await radarAccessResponse(request('/api/radar', { method: 'POST',
    headers: { authorization: basic, origin: 'https://other.test' } }), env)).status, 403);
});
test('only the admin navigation challenges and redirects after authentication', async () => {
  const challenge = await radarAccessResponse(request('/admin'), env);
  assert.equal(challenge.status, 401);
  assert.match(challenge.headers.get('www-authenticate'), /^Basic /);
  assert.equal((await radarAccessResponse(request('/api/radar', { method: 'POST' }), env)).headers.get('www-authenticate'), null);
  const redirect = await radarAccessResponse(request('/admin', { headers: { authorization: basic } }), env);
  assert.equal(redirect.status, 303);
  assert.equal(redirect.headers.get('location'), '/');
});
test('HTTP public navigation is redirected before authentication', async () => {
  const redirect = await radarAccessResponse(new Request('http://radar.test/admin'), env);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://radar.test/admin');
});
test('access status is not cached and never discloses a password', async () => {
  const response = await radarAccessResponse(request('/api/access', { headers: { authorization: basic } }), env);
  assert.deepEqual(await response.json(), { owner: true, configured: true });
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('UTF-8 administration credentials are decoded correctly', async () => {
  const utf8env = { RADAR_ADMIN_PASSWORD: 'synthetic-\u00fc-test-password' };
  const authorization = `Basic ${Buffer.from(`admin:${utf8env.RADAR_ADMIN_PASSWORD}`).toString('base64')}`;
  assert.equal(await isRadarOwner(request('/', { headers: { authorization } }), utf8env), true);
});

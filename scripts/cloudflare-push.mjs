import { generateKeyPairSync } from 'node:crypto';

export const pushNames = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];
export function pushSetup(names) {
  const present = pushNames.filter(name => names.includes(name));
  if (present.length === pushNames.length) return 'preserve';
  if (present.length) throw new Error('Incomplete production push secrets. Refusing to replace existing keys.');
  return 'create';
}
export function generatePushSecrets(subject) {
  const url = new URL(subject);
  if (url.protocol !== 'https:') throw new Error('An HTTPS subject is required.');
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  return {
    VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url'),
    VAPID_PRIVATE_KEY: jwk.d,
    VAPID_SUBJECT: url.origin,
  };
}

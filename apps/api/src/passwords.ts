import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const N = 131072, r = 8, p = 1;
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, {N, r, p, maxmem: 256 * 1024 * 1024}, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function checkPassword(password: string, stored?: string | null) {
  // Unknown identities still perform the same expensive derivation.
  const [, salt, expected] = stored?.split('$') ?? [];
  const actual = await derive(password, salt ?? '0'.repeat(32));
  return !!expected && /^[a-f0-9]{128}$/.test(expected) && timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

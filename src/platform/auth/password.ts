import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('La contraseña local debe tener al menos 12 caracteres.');
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, keyLength) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, keyHex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, salt, keyLength) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

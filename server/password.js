import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, KEY_LENGTH);
    return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verificarSenha(password, storedPassword) {
    if (storedPassword.startsWith('scrypt:')) {
        const [, salt, storedHash] = storedPassword.split(':');
        if (!salt || !storedHash || !/^[a-f\d]+$/i.test(storedHash)) return false;

        const expected = Buffer.from(storedHash, 'hex');
        if (expected.length !== KEY_LENGTH) return false;

        const actual = await scrypt(password, salt, KEY_LENGTH);
        return timingSafeEqual(expected, actual);
    }

    const passwordBuffer = Buffer.from(password);
    const storedBuffer = Buffer.from(storedPassword);
    return passwordBuffer.length === storedBuffer.length
        && timingSafeEqual(passwordBuffer, storedBuffer);
}

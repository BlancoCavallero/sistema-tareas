import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, HASH_PREFIX } from './password';

describe('hashPassword', () => {
	it('produces the pbkdf2$sha256$<iterations>$<salt>$<hash> format', async () => {
		const hash = await hashPassword('correct horse battery staple');
		const parts = hash.split('$');
		expect(parts).toHaveLength(5);
		expect(hash.startsWith(HASH_PREFIX)).toBe(true);
		expect(parts[2]).toBe('15000');
		// salt and hash are base64-encoded 16 and 32 bytes respectively
		expect(parts[3].length).toBeGreaterThanOrEqual(20);
		expect(parts[4].length).toBeGreaterThanOrEqual(40);
	});

	it('produces a different hash per password with the same format', async () => {
		const a = await hashPassword('secret-one');
		const b = await hashPassword('secret-two');
		expect(a).not.toBe(b);
		expect(a.split('$').slice(0, 3)).toEqual(b.split('$').slice(0, 3));
	});
});

describe('verifyPassword', () => {
	it('accepts the correct password', async () => {
		const hash = await hashPassword('mi-contraseña');
		await expect(verifyPassword('mi-contraseña', hash)).resolves.toBe(true);
	});

	it('rejects a wrong password', async () => {
		const hash = await hashPassword('correcta');
		await expect(verifyPassword('incorrecta', hash)).resolves.toBe(false);
	});

	it('verifies hashes generated with other in-range iteration counts', async () => {
		const hash = await hashPassword('clave', 12000);
		expect(hash.includes('$12000$')).toBe(true);
		await expect(verifyPassword('clave', hash)).resolves.toBe(true);
	});

	it('rejects a tampered salt', async () => {
		const hash = await hashPassword('clave');
		const parts = hash.split('$');
		parts[3] =
			parts[3] === 'AAAAAAAAAAAAAAAAAAAAAA=='
				? 'BBBBBBBBBBBBBBBBBBBBBB=='
				: 'AAAAAAAAAAAAAAAAAAAAAA==';
		await expect(verifyPassword('clave', parts.join('$'))).resolves.toBe(false);
	});

	it('rejects a tampered hash component', async () => {
		const hash = await hashPassword('clave');
		const parts = hash.split('$');
		// flip the last character of the hash segment
		parts[4] = parts[4].endsWith('=')
			? parts[4].slice(0, -1) + (parts[4].endsWith('==') ? 'A=' : 'A')
			: parts[4] + 'A';
		await expect(verifyPassword('clave', parts.join('$'))).resolves.toBe(false);
	});

	it('rejects out-of-range iteration counts', async () => {
		const hash = await hashPassword('clave');
		const parts = hash.split('$');
		parts[2] = '9999';
		await expect(verifyPassword('clave', parts.join('$'))).resolves.toBe(false);
		parts[2] = '26000';
		await expect(verifyPassword('clave', parts.join('$'))).resolves.toBe(false);
	});

	it('rejects malformed encoded values without throwing', async () => {
		await expect(verifyPassword('clave', '')).resolves.toBe(false);
		await expect(verifyPassword('clave', 'pbkdf2$sha256$15000$only-three-parts')).resolves.toBe(
			false
		);
		await expect(verifyPassword('clave', 'bcrypt$12$xxxx')).resolves.toBe(false);
		await expect(
			verifyPassword('clave', 'pbkdf2$sha256$15000$@@not-base64@@$c2FsdA==')
		).resolves.toBe(false);
		await expect(verifyPassword('clave', 'pbkdf2$sha256$abc$c2FsdA==$a2V5')).resolves.toBe(false);
	});
});

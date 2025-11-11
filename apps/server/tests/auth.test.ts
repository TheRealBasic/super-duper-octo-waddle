import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password';

describe('password hashing', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('Password123!');
    expect(hash).not.toBe('Password123!');
    const ok = await verifyPassword('Password123!', hash);
    expect(ok).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { authDestination, safeReturnPath } from '@/lib/authFlow';

describe('safe account transitions', () => {
  it('keeps anonymous and unconfirmed upgrading users on the auth flow', () => {
    expect(authDestination({ id: 'guest', is_anonymous: true }, null, false)).toBe('auth');
    expect(authDestination({ id: 'guest', is_anonymous: false }, 'guest', true)).toBe('auth');
  });
  it('requires password completion only for the confirmed upgrade identity', () => {
    expect(authDestination({ id: 'guest', is_anonymous: false, email_confirmed_at: 'now' }, 'guest', false)).toBe('set-password');
    expect(authDestination({ id: 'existing', is_anonymous: false, email_confirmed_at: 'now' }, 'guest', false)).toBe('workspace');
  });
  it('preserves a safe return route without permitting external redirects', () => {
    expect(safeReturnPath('/simulate?resume=report')).toBe('/simulate?resume=report');
    for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', '/\nevil', null]) expect(safeReturnPath(path)).toBe('/my-simulations');
  });
});

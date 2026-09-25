import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import Auth from '@/pages/Auth';

const mock = vi.hoisted(() => ({
  user: { id: 'guest-uid', is_anonymous: true, email_confirmed_at: null as string | null },
  listener: null as null | ((event: string, session: { user: unknown }) => void),
  updateUser: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ error: null })),
  signInWithPassword: vi.fn(),
  linkIdentity: vi.fn(async () => ({ error: null })),
  clearDrafts: vi.fn(() => localStorage.removeItem('vibeco_general_draft')),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: {
    getSession: async () => ({ data: { session: { user: mock.user } } }),
    onAuthStateChange: (callback: typeof mock.listener) => { mock.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
    updateUser: mock.updateUser, signUp: mock.signUp, signInWithPassword: mock.signInWithPassword, linkIdentity: mock.linkIdentity,
  },
  from: () => ({ select: () => ({ eq: async () => ({ data: [], error: null }) }) }),
} }));
vi.mock('@/integrations/lovable/index', () => ({ lovable: { auth: { signInWithOAuth: vi.fn() } } }));
vi.mock('@/lib/browserDrafts', () => ({ clearBrowserDrafts: mock.clearDrafts }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function mount(route = '/auth?returnTo=%2Fsimulate') {
  render(<MemoryRouter initialEntries={[route]}><Routes><Route path="/auth" element={<Auth />} /><Route path="/simulate" element={<h1>Saved workspace {localStorage.getItem('vibeco_general_draft') ? 'with draft' : 'without old draft'}</h1>} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.clearAllMocks();
  mock.user = { id: 'guest-uid', is_anonymous: true, email_confirmed_at: null };
  mock.signInWithPassword.mockImplementation(async () => {
    mock.listener?.('SIGNED_IN', { user: { id: 'existing-uid', is_anonymous: false, email_confirmed_at: 'now' } });
    return { error: null };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('guest auth interface', () => {
  it('stays on auth for a guest and adds email to the existing identity', async () => {
    mount();
    await screen.findByText('Keep what you started.');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'guest@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify email and keep my work' }));
    await waitFor(() => expect(mock.updateUser).toHaveBeenCalledWith({ email: 'guest@example.test' }, { emailRedirectTo: expect.stringContaining('/auth?finish=1') }));
    expect(mock.signUp).not.toHaveBeenCalled();
    expect(localStorage.getItem('vibeco-pending-guest-upgrade')).toBe('guest-uid');
    expect(mock.clearDrafts).not.toHaveBeenCalled();
  });
  it('sets the password only after verification and preserves the draft', async () => {
    mock.user = { id: 'guest-uid', is_anonymous: false, email_confirmed_at: 'now' };
    localStorage.setItem('vibeco-pending-guest-upgrade', 'guest-uid');
    localStorage.setItem('vibeco_general_draft', 'draft');
    mount('/auth?finish=1&returnTo=%2Fsimulate');
    await screen.findByText('Finish your account.');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'safe-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));
    await waitFor(() => expect(mock.updateUser).toHaveBeenCalledWith({ password: 'safe-password' }));
    expect(localStorage.getItem('vibeco_general_draft')).toBe('draft');
    expect(mock.clearDrafts).not.toHaveBeenCalled();
  });
  it('requires a recovery download before switching accounts, then clears guest drafts', async () => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL() { return 'blob:backup'; }
      static revokeObjectURL() {}
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    localStorage.setItem('vibeco_general_draft', 'guest-only');
    mount();
    await screen.findByText('Keep what you started.');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'existing' } });
    expect(screen.getAllByRole('button', { name: 'Sign in' })[0]).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Download guest work' }));
    await screen.findByText('Keep the JSON recovery archive. It includes your saved reports and local drafts.');
    await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0]));
    await waitFor(() => expect(mock.clearDrafts).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem('vibeco_general_draft')).toBeNull();
    expect(mock.signInWithPassword).toHaveBeenCalledWith({ email: 'existing@example.test', password: 'existing' });
  });
});

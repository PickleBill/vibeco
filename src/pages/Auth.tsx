import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Download, Mail } from 'lucide-react';
import { safeReturnPath, authDestination } from '@/lib/authFlow';
import { clearBrowserDrafts } from '@/lib/browserDrafts';

const UPGRADE_KEY = 'vibeco-pending-guest-upgrade';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const returnTo = safeReturnPath(params.get('returnTo'));
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [backupReady, setBackupReady] = useState(false);
  const switchingAccount = useRef(false);
  const isGuest = user?.is_anonymous === true;

  useEffect(() => {
    let active = true;
    const update = (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      setInitializing(false);
      const pendingUid = localStorage.getItem(UPGRADE_KEY);
      const destination = authDestination(nextUser, pendingUid, params.get('finish') === '1');
      if (destination === 'set-password') setNeedsPassword(true);
      if (destination === 'workspace' && !switchingAccount.current) navigate(returnTo, { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => update(session?.user ?? null));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.is_anonymous) setIsLogin(false);
      update(session?.user ?? null);
    }).catch(() => { setInitializing(false); toast.error('Your session could not be read. Please reload.'); });
    return () => { active = false; subscription.unsubscribe(); };
  // URL values are fixed for this auth visit; avoid resubscribing on form changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, returnTo]);

  const callback = `${window.location.origin}/auth?finish=1&returnTo=${encodeURIComponent(returnTo)}`;

  const downloadGuestWork = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: reports, error } = await supabase.from('idea_reports').select('*').eq('user_id', user.id);
      if (error) throw error;
      const ids = (reports ?? []).map(report => report.id);
      const [perspectives, stack] = ids.length ? await Promise.all([
        supabase.from('idea_perspectives').select('*').in('report_id', ids),
        supabase.from('idea_stack_items').select('*').in('report_id', ids),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      if (perspectives.error) throw perspectives.error;
      if (stack.error) throw stack.error;
      const drafts = Object.fromEntries(Object.keys(localStorage)
        .filter(key => key.startsWith('vibeco') && /draft|simulat|workbench|session/i.test(key) && !/auth|token/i.test(key))
        .map(key => [key, localStorage.getItem(key)]));
      const sessionDrafts = Object.fromEntries(Object.keys(sessionStorage)
        .filter(key => key.startsWith('vibeco') && /draft|simulat|workbench|session/i.test(key) && !/auth|token/i.test(key))
        .map(key => [key, sessionStorage.getItem(key)]));
      const archive = { format: 'vibeco-guest-backup', version: 1, exportedAt: new Date().toISOString(), reports: reports ?? [], perspectives: perspectives.data ?? [], stack: stack.data ?? [], drafts, sessionDrafts };
      const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vibeco-guest-work.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupReady(true);
      toast.success('Guest recovery archive downloaded. You can now sign in.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Backup failed. Your guest session is still active.'); }
    finally { setLoading(false); }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      if (isGuest) {
        // linkIdentity preserves the guest UID and all its RLS-owned work.
        // It must be enabled in Supabase; failures leave the guest signed in.
        const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}${returnTo}` } });
        if (error) throw error;
      } else {
        const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}${returnTo}` });
        if (error) throw error;
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Sign-in failed. Try email instead.'); }
    finally { setLoading(false); }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (needsPassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        localStorage.removeItem(UPGRADE_KEY);
        toast.success('Account ready. Your guest work is still yours.');
        navigate(returnTo, { replace: true });
      } else if (isGuest && !isLogin) {
        // Passwords can only be added after email confirmation. Do not create a
        // second user with signUp(), which would strand existing guest reports.
        localStorage.setItem(UPGRADE_KEY, user.id);
        const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: callback });
        if (error) { localStorage.removeItem(UPGRADE_KEY); throw error; }
        setEmailSent(true);
        toast.success('Check your email, then return here to choose a password.');
      } else if (isLogin) {
        if (isGuest && !backupReady) throw new Error('Download your guest work before switching to an existing account.');
        switchingAccount.current = true;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.removeItem(UPGRADE_KEY);
        clearBrowserDrafts();
        navigate(returnTo, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${returnTo}` } });
        if (error) throw error;
        setEmailSent(true);
        toast.success('Check your email to confirm your account.');
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The account change did not complete. Please try again.'); }
    finally { switchingAccount.current = false; setLoading(false); }
  };

  return <main className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
    <div className="w-full max-w-md">
      <Button variant="ghost" onClick={() => navigate(returnTo)} className="mb-8 -ml-4 gap-2"><ArrowLeft size={15} /> Back to your work</Button>
      <p className="text-xs uppercase tracking-[.18em] text-primary mb-3">Your private workspace</p>
      <h1 className="font-display text-3xl font-black mb-3">{needsPassword ? 'Finish your account.' : isGuest && !isLogin ? 'Keep what you started.' : isLogin ? 'Welcome back.' : 'Create your account.'}</h1>
      <p className="text-sm text-muted-foreground mb-7">{needsPassword ? 'Your email is confirmed. Choose a password to keep using the same workspace.' : isGuest && !isLogin ? 'Add an email to your guest session. Your existing reports stay with you.' : 'Save research, revisit decisions, and continue your thinking.'}</p>
      {emailSent && <p role="status" className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm mb-5">Check your inbox for the confirmation link. Open it in this browser to finish. Your current work is still available.</p>}
      {isGuest && isLogin && <div className="rounded-lg border p-4 mb-6 text-sm space-y-3">
        <p>Your existing account has a separate workspace. Download your guest work first; it will not automatically transfer.</p>
        <Button variant="outline" disabled={loading} onClick={downloadGuestWork} className="gap-2"><Download size={16} /> {backupReady ? 'Download again' : 'Download guest work'}</Button>
        {backupReady && <p role="status" className="text-muted-foreground text-xs">Keep the JSON recovery archive. It includes your saved reports and local drafts.</p>}
      </div>}
      {!needsPassword && !(isGuest && isLogin) && <div className="space-y-3 mb-6">
        <Button variant="outline" className="w-full h-11" disabled={loading || initializing} onClick={() => handleOAuth('google')}>{isGuest ? 'Connect Google and keep this work' : 'Continue with Google'}</Button>
        <Button variant="outline" className="w-full h-11" disabled={loading || initializing} onClick={() => handleOAuth('apple')}>{isGuest ? 'Connect Apple and keep this work' : 'Continue with Apple'}</Button>
        <p className="text-center text-xs text-muted-foreground pt-2">or use email</p>
      </div>}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {!needsPassword && <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required className="mt-1" placeholder="you@example.com" /></div>}
        {(needsPassword || isLogin || !isGuest) && <div><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={isLogin && !needsPassword ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={isLogin && !needsPassword ? 1 : 8} className="mt-1" /></div>}
        <Button type="submit" disabled={loading || initializing || (isGuest && isLogin && !backupReady)} className="w-full h-11 gap-2"><Mail size={16} />{loading ? 'Working…' : needsPassword ? 'Save password and continue' : isGuest && !isLogin ? 'Verify email and keep my work' : isLogin ? 'Sign in' : 'Create account'}</Button>
      </form>
      {!needsPassword && <p className="text-sm text-muted-foreground text-center mt-6">{isLogin ? 'Need an account?' : 'Already have an account?'}{' '}<button onClick={() => { setIsLogin(!isLogin); setEmailSent(false); }} className="text-primary underline underline-offset-4">{isLogin ? 'Create one' : 'Sign in'}</button></p>}
    </div>
  </main>;
}

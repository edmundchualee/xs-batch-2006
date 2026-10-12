import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, friendlyError } from '../../lib/supabase';
import { Header, Spinner } from '../../components/Chrome';
import EventList from './EventList';
import EventEditor from './EventEditor';
import Registrations from './Registrations';
import Codes from './Codes';

export default function Committee() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [member, setMember] = useState<{ full_name: string; email: string } | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setMember(session === null ? null : undefined); return; }
    supabase.from('committee').select('full_name,email').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setMember(data ?? null));
  }, [session]);

  if (session === undefined || (session && member === undefined)) return <><Header /><Spinner /></>;
  if (!session) return <><Header /><Auth /></>;
  if (!member) return (
    <><Header /><main className="center"><div className="card" style={{ maxWidth: 420 }}>
      <h2>Not a committee account</h2>
      <p className="muted" style={{ margin: 0 }}>You’re signed in, but this account isn’t on the committee.</p>
      <button className="btn navy" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div></main></>
  );

  return (
    <>
      <Header />
      <main className="wrap admin">
        <div className="admin-head">
          <div><span className="eyebrow">Committee</span><h1>Hi, {member.full_name.split(' ')[0] || 'there'}</h1></div>
          <div className="row">
            <nav className="tabs" aria-label="Committee">
              <NavLink to="/committee" end>Events</NavLink>
              <NavLink to="/committee/codes">Committee access</NavLink>
            </nav>
            <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
        <Routes>
          <Route index element={<EventList />} />
          <Route path="events/:id" element={<EventEditor />} />
          <Route path="events/:id/registrations" element={<Registrations />} />
          <Route path="codes" element={<Codes />} />
          <Route path="*" element={<Navigate to="/committee" replace />} />
        </Routes>
      </main>
    </>
  );
}

function Auth() {
  const [mode, setMode] = useState<'in' | 'join'>('in');
  const [f, setF] = useState({ name: '', email: '', password: '', code: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
      : f.password.length < 8
        ? { error: { message: 'Use at least 8 characters for your password.' } }
        : await supabase.auth.signUp({ email: f.email.trim(), password: f.password, options: { data: { full_name: f.name.trim(), code: f.code.trim() } } });
    setBusy(false);
    if (res.error) setError(friendlyError(res.error.message));
    else if (mode === 'join' && !('data' in res && res.data.session)) setError('Account created. If email confirmation is on, confirm your email, then sign in.');
  }

  const field = (label: ReactNode, k: keyof typeof f, type = 'text', auto?: string) => (
    <label className="field">{label}<input id={`c-${k}`} type={type} required autoComplete={auto} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>
  );

  return (
    <main className="center">
      <form className="card" style={{ width: '100%', maxWidth: 400 }} onSubmit={submit}>
        <div><span className="eyebrow">Committee</span><h2>{mode === 'in' ? 'Sign in' : 'Join the committee'}</h2></div>
        {mode === 'join' && field('Committee code', 'code')}
        {mode === 'join' && field('Full name', 'name', 'text', 'name')}
        {field('Email', 'email', 'email', 'email')}
        {field('Password', 'password', 'password', mode === 'in' ? 'current-password' : 'new-password')}
        {error && <div className={`alert ${error.startsWith('Account created') ? 'warn' : 'bad'}`} role="alert">{error}</div>}
        <button className="btn navy" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="btn ghost sm" onClick={() => { setMode(mode === 'in' ? 'join' : 'in'); setError(''); }}>
          {mode === 'in' ? 'I have a committee code' : 'I already have an account'}
        </button>
        <Link to="/" className="muted" style={{ fontSize: 14, textAlign: 'center' }}>← Back to the batch site</Link>
      </form>
    </main>
  );
}

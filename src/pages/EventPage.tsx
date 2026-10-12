import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header, Footer, Spinner } from '../components/Chrome';
import { ScoreFacts } from '../components/Scorecard';
import { supabase, isClosed, isPast, friendlyError, type EventRow } from '../lib/supabase';

export default function EventPage() {
  const { slug } = useParams();
  const [e, setE] = useState<EventRow | null | undefined>(undefined);
  const [count, setCount] = useState<{ registered: number; waitlist: number } | null>(null);

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', slug).maybeSingle().then(({ data }) => setE(data as EventRow | null));
  }, [slug]);
  useEffect(() => {
    if (!e) return;
    supabase.rpc('event_counts').then(({ data }) => {
      const row = (data as { event_id: string; registered: number; waitlist: number }[] | null)?.find(r => r.event_id === e.id);
      if (row) setCount(row);
    });
  }, [e]);

  if (e === undefined) return <><Header /><Spinner /></>;
  if (e === null) return (
    <><Header /><main className="wrap center"><div className="empty">This event isn’t available. <Link to="/events">See all events</Link></div></main><Footer /></>
  );

  const full = e.capacity != null && count != null && count.registered >= e.capacity;
  const spotsLeft = e.capacity != null && count != null ? Math.max(0, e.capacity - count.registered) : null;

  return (
    <>
      <Header />
      <div className="wrap">
        <section className="event-hero">
          <Link to="/events" className="eyebrow" style={{ textDecoration: 'none' }}>← All events</Link>
          <h1>{e.title}</h1>
          {e.tagline && <p>{e.tagline}</p>}
        </section>
        <div className="scorecard" style={{ marginTop: 32 }}>
          <div className="intro">
            <span className="eyebrow">Official scorecard</span>
            <p>{isPast(e) ? 'This event has passed.' : isClosed(e) ? 'Registration is closed.' : full ? 'Fully booked. Sign up for the waitlist below.' : spotsLeft != null ? `${spotsLeft} slot${spotsLeft === 1 ? '' : 's'} left. Sign the card below.` : 'Registration is open. Sign the card below.'}</p>
          </div>
          <ScoreFacts e={e} going={count?.registered ?? null} />
        </div>
      </div>
      <main className="wrap event-grid">
        <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
          {e.description ? <p className="prose">{e.description}</p> : <p className="muted">More details soon.</p>}
          {e.payment_info && (<div style={{ display: 'grid', gap: 8 }}><span className="eyebrow">How to pay</span><div className="pay">{e.payment_info}</div></div>)}
        </div>
        <aside className="card">
          {isPast(e) ? <><h2>This event has passed</h2><p className="muted" style={{ margin: 0 }}>Thanks to everyone who came.</p></>
            : isClosed(e) ? <><h2>Registration closed</h2><p className="muted" style={{ margin: 0 }}>Reach out to the batch committee if you still want to join.</p></>
            : <RegisterForm e={e} full={full} spotsLeft={spotsLeft} />}
        </aside>
      </main>
      <Footer />
    </>
  );
}

function RegisterForm({ e, full, spotsLeft }: { e: EventRow; full: boolean; spotsLeft: number | null }) {
  const [base, setBase] = useState({ name: '', email: '', mobile: '' });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<null | 'registered' | 'waitlist'>(null);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setError('');
    const { data, error } = await supabase.rpc('register', {
      p_event: e.id, p_name: base.name, p_email: base.email, p_mobile: base.mobile, p_answers: answers,
    });
    setBusy(false);
    if (error) return setError(friendlyError(error.message));
    setDone(data as 'registered' | 'waitlist');
  }

  if (done) return (
    <div className="done">
      <div className="tick">✓</div>
      <h2>{done === 'registered' ? 'You’re in!' : 'You’re on the waitlist'}</h2>
      <p className="muted" style={{ margin: 0 }}>
        {done === 'registered'
          ? `See you at ${e.title}, ${base.name.split(' ')[0]}.${e.payment_info ? ' Don’t forget to settle the fee using the payment details on this page.' : ''}`
          : 'The event is full right now. The committee will contact you if a slot opens up.'}
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div>
        <h2>Register</h2>
        {spotsLeft !== null && <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>{full ? 'Fully booked. You can still join the waitlist.' : `${spotsLeft} slot${spotsLeft === 1 ? '' : 's'} left`}</p>}
      </div>
      <label className="field">Full name<input id="r-name" required autoComplete="name" value={base.name} onChange={x => setBase({ ...base, name: x.target.value })} /></label>
      <label className="field">Email<input id="r-email" type="email" required autoComplete="email" value={base.email} onChange={x => setBase({ ...base, email: x.target.value })} /></label>
      <label className="field">Mobile number <small>(optional)</small><input id="r-mobile" type="tel" autoComplete="tel" value={base.mobile} onChange={x => setBase({ ...base, mobile: x.target.value })} placeholder="09XX XXX XXXX" /></label>
      {e.fields.map(f => (
        <label key={f.key} className="field">{f.label}{!f.required && <small> (optional)</small>}
          {f.type === 'select' ? (
            <select id={`r-${f.key}`} required={f.required} value={answers[f.key] ?? ''} onChange={x => setAnswers({ ...answers, [f.key]: x.target.value })}>
              <option value="">Choose…</option>
              {(f.options ?? []).map(o => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === 'yesno' ? (
            <select id={`r-${f.key}`} required={f.required} value={answers[f.key] ?? ''} onChange={x => setAnswers({ ...answers, [f.key]: x.target.value })}>
              <option value="">Choose…</option><option>Yes</option><option>No</option>
            </select>
          ) : (
            <input id={`r-${f.key}`} required={f.required} value={answers[f.key] ?? ''} onChange={x => setAnswers({ ...answers, [f.key]: x.target.value })} />
          )}
        </label>
      ))}
      {error && <div className="alert bad" role="alert">{error}</div>}
      <button className="btn navy" disabled={busy}>{busy ? 'Saving…' : full ? 'Join the waitlist' : 'Sign the card'}</button>
    </form>
  );
}

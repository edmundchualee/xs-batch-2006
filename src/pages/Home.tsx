import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LightField from '../components/LightField';
import { Header, Footer, Spinner } from '../components/Chrome';
import { supabase, fmt, isPast, isClosed, type EventRow } from '../lib/supabase';
import { EventCard } from './Events';

export default function Home() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  useEffect(() => {
    supabase.from('events').select('*').eq('published', true).order('starts_at', { ascending: true, nullsFirst: false })
      .then(({ data }) => setEvents((data ?? []) as EventRow[]));
  }, []);

  const upcoming = (events ?? []).filter(e => !isPast(e));
  const next = upcoming[0];
  const years = new Date().getFullYear() - 2006;

  return (
    <>
      <Header />
      <section className="hero">
        <LightField />
        <div className="wrap hero-inner">
          <img className="seal" src="/xs-seal.png" alt="Xavier School seal" />
          <span className="motto">Luceat Lux</span>
          <h1>Xavier School <em>Batch 2006</em></h1>
          <div className="years"><i />2006 · {years} YEARS · {2006 + years}<i /></div>
          <p>Our batch’s home for reunions, golf days and everything in between. Find what’s coming up and save your spot.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {next ? <Link className="btn" to={`/events/${next.slug}`}>{isClosed(next) ? 'See' : 'Register for'} {next.title}</Link>
                  : <Link className="btn" to="/events">See events</Link>}
          </div>
          <span className="hint">Move or tap across the light.</span>
        </div>
      </section>

      <main className="wrap">
        {events === null ? <Spinner /> : (
          <>
            {next && (
              <section className="section">
                <span className="eyebrow">Next up</span>
                <div className="feature">
                  <div style={{ display: 'grid', gap: 12, position: 'relative', zIndex: 1 }}>
                    <h2>{next.title}</h2>
                    {next.tagline && <p style={{ margin: 0, color: 'rgba(255,255,255,.8)', fontSize: 18 }}>{next.tagline}</p>}
                    <div><Link className="btn" to={`/events/${next.slug}`}>{isClosed(next) ? 'Event details' : 'Register now'}</Link></div>
                  </div>
                  <dl>
                    <div><dt>When</dt><dd>{fmt.date(next.starts_at)}{next.starts_at && ` · ${fmt.time(next.starts_at)}`}</dd></div>
                    {next.venue && <div><dt>Where</dt><dd>{next.venue}</dd></div>}
                    {next.fee && <div><dt>Fee</dt><dd>{next.fee}</dd></div>}
                    {next.registration_deadline && !isClosed(next) && <div><dt>Register by</dt><dd>{fmt.date(next.registration_deadline)}</dd></div>}
                  </dl>
                </div>
              </section>
            )}

            <section className="section" style={{ paddingTop: next ? 0 : undefined }}>
              <div className="section-head">
                <div><span className="eyebrow">Batch events</span><h2>What’s coming up</h2></div>
                <Link to="/events" className="btn ghost sm">All events</Link>
              </div>
              {upcoming.length === 0
                ? <div className="empty">No upcoming events yet. The committee will post the next one here.</div>
                : <div className="events">{upcoming.slice(0, 6).map(e => <EventCard key={e.id} e={e} />)}</div>}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

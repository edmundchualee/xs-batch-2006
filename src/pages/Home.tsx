import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LightField from '../components/LightField';
import { Header, Footer, Spinner } from '../components/Chrome';
import { ScoreFacts } from '../components/Scorecard';
import { supabase, isPast, isClosed, type EventRow } from '../lib/supabase';
import { EventCard } from './Events';

export default function Home() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  useEffect(() => {
    supabase.from('events').select('*').eq('published', true).order('starts_at', { ascending: true, nullsFirst: false })
      .then(({ data }) => setEvents((data ?? []) as EventRow[]));
  }, []);

  const upcoming = (events ?? []).filter(e => !isPast(e));
  const next = upcoming[0];
  const rest = upcoming.slice(1);
  const years = new Date().getFullYear() - 2006;

  return (
    <>
      <Header />
      <section className="hero">
        <LightField />
        <div className="wrap hero-inner">
          <div className="rule"><img className="seal" src="/xs-seal.png" alt="Xavier School seal" /></div>
          <span className="eyebrow">Class of 2006 · {years} years</span>
          <h1>Xavier School<br />Batch of 2006</h1>
          <p className="lede">Luceat Lux. {years} years on, still the same table.</p>
          <Link className="btn" to={next ? `/events/${next.slug}` : '/events'}>{next && !isClosed(next) ? 'Reserve your place' : 'See events'}</Link>
          <span className="hint">Move or tap across the light.</span>
        </div>
      </section>

      <main className="wrap">
        {events === null ? <Spinner /> : (
          <section className="section">
            <div className="section-head">
              <h2>The Fixture List</h2>
              <Link to="/events" className="eyebrow" style={{ textDecoration: 'none' }}>All events →</Link>
            </div>

            {next ? (
              <div className="scorecard">
                <div className="intro">
                  <span className="eyebrow">Next up{isClosed(next) ? ' · Registration closed' : ''}</span>
                  <h3>{next.title}</h3>
                  {next.tagline && <p>{next.tagline}</p>}
                  <div><Link className="btn navy" to={`/events/${next.slug}`}>{isClosed(next) ? 'Event details' : 'Sign the card'}</Link></div>
                </div>
                <ScoreFacts e={next} />
              </div>
            ) : <div className="empty">No upcoming events yet. The committee will post the next one here.</div>}

            {rest.length > 0 && <div className="events">{rest.slice(0, 6).map(e => <EventCard key={e.id} e={e} />)}</div>}
          </section>
        )}
      </main>

      <section className="about">
        <div className="wrap">
          <span className="eyebrow">The Batch</span>
          <p>Our home for reunions, golf days and every excuse to get Batch 2006 back together. See what’s coming up and save your spot in a minute.</p>
        </div>
      </section>
      <Footer />
    </>
  );
}

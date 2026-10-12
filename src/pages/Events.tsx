import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer, Spinner } from '../components/Chrome';
import { supabase, fmt, isPast, isClosed, type EventRow } from '../lib/supabase';

export function EventCard({ e }: { e: EventRow }) {
  const past = isPast(e);
  return (
    <Link to={`/events/${e.slug}`} className={`ev ${past ? 'past' : ''}`}>
      <div className="date"><b>{fmt.day(e.starts_at)}</b><span>{fmt.mon(e.starts_at)}</span></div>
      <div className="body">
        <h3>{e.title}</h3>
        <span className="muted" style={{ fontSize: 14 }}>{[e.starts_at && fmt.time(e.starts_at), e.venue].filter(Boolean).join(' · ') || 'Details to follow'}</span>
        {past ? <span className="pill muted">Past event</span> : isClosed(e) ? <span className="pill bad">Registration closed</span> : <span className="pill ok">Registration open</span>}
      </div>
    </Link>
  );
}

export default function Events() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  useEffect(() => {
    supabase.from('events').select('*').eq('published', true).order('starts_at', { ascending: true, nullsFirst: false })
      .then(({ data }) => setEvents((data ?? []) as EventRow[]));
  }, []);
  const upcoming = (events ?? []).filter(e => !isPast(e));
  const past = (events ?? []).filter(isPast).reverse();

  return (
    <>
      <Header solid />
      <main className="wrap">
        <section className="section">
          <div><span className="eyebrow">Batch 2006</span><h1 style={{ fontSize: 'clamp(34px,5vw,52px)' }}>Events</h1></div>
          {events === null ? <Spinner /> : upcoming.length === 0
            ? <div className="empty">No upcoming events yet. Check back soon.</div>
            : <div className="events">{upcoming.map(e => <EventCard key={e.id} e={e} />)}</div>}
        </section>
        {past.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <h2 style={{ fontSize: 28 }}>Past events</h2>
            <div className="events">{past.map(e => <EventCard key={e.id} e={e} />)}</div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

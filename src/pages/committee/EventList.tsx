import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, fmt, isClosed, isPast, type EventRow } from '../../lib/supabase';
import { Spinner } from '../../components/Chrome';

type Row = EventRow & { registrations: { status: string }[] };

export default function EventList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    supabase.from('events').select('*, registrations(status)').order('starts_at', { ascending: false, nullsFirst: true })
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, []);

  if (!rows) return <Spinner />;
  return (
    <div className="rows">
      <div className="row spread">
        <p className="muted" style={{ margin: 0 }}>Drafts are only visible to the committee. Publish an event to put it on the site.</p>
        <Link to="/committee/events/new" className="btn">+ New event</Link>
      </div>
      {rows.length === 0 && <div className="empty">No events yet. Create the first one.</div>}
      {rows.map(e => {
        const going = e.registrations.filter(r => r.status === 'registered').length;
        const wait = e.registrations.filter(r => r.status === 'waitlist').length;
        return (
          <div key={e.id} className="card" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <b style={{ fontFamily: 'var(--f-display)', fontSize: 20 }}>{e.title}</b>
                {!e.published ? <span className="pill">Draft</span> : isPast(e) ? <span className="pill muted">Past</span> : isClosed(e) ? <span className="pill bad">Closed</span> : <span className="pill ok">Open</span>}
              </div>
              <span className="muted" style={{ fontSize: 14 }}>{fmt.date(e.starts_at)} · {going}{e.capacity ? `/${e.capacity}` : ''} registered{wait ? ` · ${wait} waitlist` : ''}</span>
            </div>
            <div className="row">
              <Link className="btn navy sm" to={`/committee/events/${e.id}/registrations`}>Registrations</Link>
              <Link className="btn ghost sm" to={`/committee/events/${e.id}`}>Edit</Link>
              {e.published && <Link className="btn ghost sm" to={`/events/${e.slug}`} target="_blank">View ↗</Link>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

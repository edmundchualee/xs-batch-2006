import type { ReactNode } from 'react';
import { fmt, type EventRow } from '../lib/supabase';

/** Event facts as a golf-scorecard grid. Only facts the committee filled in are shown. */
export function ScoreFacts({ e, going }: { e: EventRow; going?: number | null }) {
  const facts: [string, ReactNode][] = [
    ['Date', fmt.date(e.starts_at)],
    ['Start', e.starts_at ? fmt.time(e.starts_at) : 'TBA'],
  ];
  if (e.venue) facts.push(['Venue', e.venue_map_url ? <a href={e.venue_map_url} target="_blank" rel="noreferrer">{e.venue} ↗</a> : e.venue]);
  if (e.fee) facts.push(['Fee', e.fee]);
  if (e.registration_deadline) facts.push(['Register by', fmt.date(e.registration_deadline)]);
  if (e.capacity) facts.push(['Slots', `${e.capacity}`]);
  if (going != null) facts.push(['Signed up', `${going}${e.capacity ? ` of ${e.capacity}` : ''}`]);
  if (facts.length % 2) facts.push(['', '']);
  return (
    <dl>
      {facts.map(([k, v], i) => <div key={i}><dt>{k || ' '}</dt><dd>{v || ' '}</dd></div>)}
    </dl>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase, type EventRow, type Registration } from '../../lib/supabase';
import { Spinner } from '../../components/Chrome';

export default function Registrations() {
  const { id } = useParams();
  const [ev, setEv] = useState<EventRow | null>(null);
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    const [a, b] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('registrations').select('*').eq('event_id', id).order('created_at'),
    ]);
    setEv(a.data as EventRow);
    setRows((b.data ?? []) as Registration[]);
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(r: Registration, p: Partial<Registration>) {
    setRows(rs => rs!.map(x => (x.id === r.id ? { ...x, ...p } : x)));
    const { error } = await supabase.from('registrations').update(p).eq('id', r.id);
    if (error) load();
  }

  function exportCsv() {
    const cols = ['Name', 'Email', 'Mobile', ...ev!.fields.map(f => f.label), 'Status', 'Paid', 'Notes', 'Registered at'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows!.map(r => [r.full_name, r.email, r.mobile, ...ev!.fields.map(f => r.answers[f.key]), r.status, r.paid ? 'Yes' : 'No', r.notes, new Date(r.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })].map(esc).join(','));
    const blob = new Blob(['﻿' + [cols.map(esc).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${ev!.slug}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!ev || !rows) return <Spinner />;
  const going = rows.filter(r => r.status === 'registered');
  const shown = rows.filter(r => !q || `${r.full_name} ${r.email} ${r.mobile}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="rows" style={{ gap: 16 }}>
      <Link to="/committee" className="muted" style={{ fontSize: 14 }}>← All events</Link>
      <div className="row spread"><h2 style={{ fontSize: 30 }}>{ev.title}</h2>
        <div className="row"><input id="reg-search" placeholder="Search name or email" value={q} onChange={e => setQ(e.target.value)} style={{ width: 220 }} />
          <button className="btn navy sm" onClick={exportCsv} disabled={!rows.length}>Download for Excel</button></div></div>
      <div className="stats">
        <div className="stat"><b>{going.length}{ev.capacity ? <small style={{ fontSize: 16 }}> / {ev.capacity}</small> : ''}</b><span>Registered</span></div>
        <div className="stat"><b>{going.filter(r => r.paid).length}</b><span>Paid</span></div>
        <div className="stat"><b>{rows.filter(r => r.status === 'waitlist').length}</b><span>Waitlist</span></div>
        <div className="stat"><b>{rows.filter(r => r.status === 'cancelled').length}</b><span>Cancelled</span></div>
      </div>
      {rows.length === 0 ? <div className="empty">No registrations yet. Share the event link with the batch.</div> : (
        <div className="tbl">
          <table>
            <thead><tr><th>Name</th><th>Contact</th>{ev.fields.map(f => <th key={f.key}>{f.label}</th>)}<th>Status</th><th>Paid</th><th>Notes</th></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id}>
                  <td><b>{r.full_name}</b><div className="muted" style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div></td>
                  <td style={{ fontSize: 13 }}>{r.email}<div className="muted">{r.mobile}</div></td>
                  {ev.fields.map(f => <td key={f.key}>{r.answers[f.key] || '—'}</td>)}
                  <td>
                    <select id={`st-${r.id}`} value={r.status} onChange={e => patch(r, { status: e.target.value as Registration['status'] })} style={{ width: 'auto', padding: '6px 8px', fontSize: 13 }} aria-label={`Status for ${r.full_name}`}>
                      <option value="registered">Registered</option><option value="waitlist">Waitlist</option><option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td><input type="checkbox" id={`paid-${r.id}`} checked={r.paid} onChange={e => patch(r, { paid: e.target.checked })} aria-label={`${r.full_name} paid`} /></td>
                  <td><input id={`note-${r.id}`} defaultValue={r.notes} onBlur={e => e.target.value !== r.notes && patch(r, { notes: e.target.value })} style={{ minWidth: 140, padding: '6px 8px', fontSize: 13 }} aria-label="Notes" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

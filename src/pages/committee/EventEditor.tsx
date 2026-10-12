import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, friendlyError, toLocalInput, fromLocalInput, type EventRow, type Field } from '../../lib/supabase';
import { Spinner } from '../../components/Chrome';

const blank: Omit<EventRow, 'id'> = {
  slug: '', title: '', tagline: '', starts_at: null, venue: '', venue_map_url: '', description: '', fee: '',
  payment_info: '', capacity: null, registration_deadline: null, registration_open: true, published: false, fields: [],
};

const GOLF_FIELDS: Field[] = [
  { key: 'handicap', label: 'Handicap (or “none”)', type: 'text', required: true },
  { key: 'shirt', label: 'Shirt size', type: 'select', options: ['S', 'M', 'L', 'XL', 'XXL'], required: true },
  { key: 'dinner', label: 'Joining the dinner after?', type: 'yesno', required: true },
];

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export default function EventEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const [e, setE] = useState<(Omit<EventRow, 'id'> & { id?: string }) | null>(isNew ? blank : null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (isNew) { setE(blank); return; }
    supabase.from('events').select('*').eq('id', id).maybeSingle().then(({ data }) => setE(data as EventRow));
  }, [id, isNew]);

  if (!e) return <Spinner />;
  const set = <K extends keyof EventRow>(k: K, v: EventRow[K]) => { setE({ ...e, [k]: v }); setMsg(null); };
  const setField = (i: number, p: Partial<Field>) => set('fields', e.fields.map((f, j) => (j === i ? { ...f, ...p } : f)));

  async function save(publish?: boolean) {
    const fields = e!.fields
      .filter(f => f.label.trim())
      .map((f, i) => ({ ...f, key: f.key || `${slugify(f.label).replace(/-/g, '_') || 'q'}_${i}`, options: f.type === 'select' ? (f.options ?? []).filter(Boolean) : undefined }));
    const row = { ...e!, fields, slug: e!.slug || slugify(e!.title), published: publish ?? e!.published, updated_at: new Date().toISOString() };
    delete (row as { id?: string }).id;
    const res = isNew
      ? await supabase.from('events').insert(row).select('id').single()
      : await supabase.from('events').update(row).eq('id', id).select('id').single();
    if (res.error) return setMsg({ ok: false, text: friendlyError(res.error.message) });
    setE({ ...e!, ...row });
    setMsg({ ok: true, text: publish === true ? 'Published. It’s live on the site.' : publish === false ? 'Unpublished. It’s hidden from the site.' : 'Saved.' });
    if (isNew) nav(`/committee/events/${res.data.id}`, { replace: true });
  }

  async function remove() {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) setMsg({ ok: false, text: error.message }); else nav('/committee');
  }

  return (
    <div className="rows" style={{ gap: 18 }}>
      <div className="row spread">
        <Link to="/committee" className="muted" style={{ fontSize: 14 }}>← All events</Link>
        <div className="row">
          <button className="btn ghost sm" onClick={() => save()}>Save</button>
          {e.published ? <button className="btn ghost sm" onClick={() => save(false)}>Unpublish</button>
                       : <button className="btn sm" onClick={() => save(true)}>Save &amp; publish</button>}
        </div>
      </div>
      {msg && <div className={`alert ${msg.ok ? 'ok' : 'bad'}`} role="status">{msg.text}</div>}

      <div className="card">
        <h2>Event details</h2>
        <div className="grid2">
          <label className="field full">Event name<input id="e-title" value={e.title} placeholder="e.g. Batch Golf Day 2026"
            onChange={x => { const t = x.target.value; setE({ ...e, title: t, slug: slugTouched ? e.slug : slugify(t) }); setMsg(null); }} /></label>
          <label className="field full">One-line description <small>— shown under the title</small><input id="e-tag" value={e.tagline} onChange={x => set('tagline', x.target.value)} placeholder="18 holes, then dinner with the batch." /></label>
          <label className="field">Date &amp; start time<input id="e-start" type="datetime-local" value={toLocalInput(e.starts_at)} onChange={x => set('starts_at', fromLocalInput(x.target.value))} /></label>
          <label className="field">Link name <small>— the end of the event’s web address</small>
            <input id="e-slug" value={e.slug} onChange={x => { setSlugTouched(true); set('slug', slugify(x.target.value)); }} placeholder="golf-day-2026" /></label>
          <label className="field">Venue<input id="e-venue" value={e.venue} onChange={x => set('venue', x.target.value)} placeholder="Golf course or restaurant" /></label>
          <label className="field">Google Maps link <small>(optional)</small><input id="e-map" value={e.venue_map_url} onChange={x => set('venue_map_url', x.target.value)} /></label>
          <label className="field full">Full details <small>— schedule, dress code, what to bring</small><textarea id="e-desc" rows={7} value={e.description} onChange={x => set('description', x.target.value)} /></label>
        </div>
      </div>

      <div className="card">
        <h2>Fee &amp; registration</h2>
        <div className="grid2">
          <label className="field">Fee <small>(leave blank if free)</small><input id="e-fee" value={e.fee} onChange={x => set('fee', x.target.value)} placeholder="₱5,500 per player" /></label>
          <label className="field">Max slots <small>(blank = no limit; extra sign-ups go to a waitlist)</small><input id="e-cap" type="number" min={1} value={e.capacity ?? ''} onChange={x => set('capacity', x.target.value ? Number(x.target.value) : null)} /></label>
          <label className="field full">How to pay <small>(shown on the event page)</small><textarea id="e-pay" rows={3} style={{ minHeight: 80 }} value={e.payment_info} onChange={x => set('payment_info', x.target.value)} placeholder={'GCash 0917 XXX XXXX (Juan Dela Cruz)\nSend proof of payment to the batch Viber group.'} /></label>
          <label className="field">Registration deadline <small>(optional)</small><input id="e-dead" type="datetime-local" value={toLocalInput(e.registration_deadline)} onChange={x => set('registration_deadline', fromLocalInput(x.target.value))} /></label>
          <label className="field" style={{ alignContent: 'end' }}><span className="row"><input type="checkbox" id="e-open" checked={e.registration_open} onChange={x => set('registration_open', x.target.checked)} /> Registration is open</span></label>
        </div>
      </div>

      <div className="card">
        <div className="row spread"><h2>Questions on the form</h2>
          {e.fields.length === 0 && <button className="btn ghost sm" onClick={() => set('fields', GOLF_FIELDS)}>Use golf questions</button>}</div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Name, email and mobile are always asked. Add anything else this event needs.</p>
        {e.fields.map((f, i) => (
          <div key={i} className="qrow">
            <input id={`f-label-${i}`} value={f.label} onChange={x => setField(i, { label: x.target.value })} placeholder="Question" aria-label="Question" />
            <select id={`f-type-${i}`} value={f.type} onChange={x => setField(i, { type: x.target.value as Field['type'] })} aria-label="Answer type">
              <option value="text">Short answer</option><option value="select">Choices</option><option value="yesno">Yes / No</option>
            </select>
            {f.type === 'select'
              ? <input id={`f-opts-${i}`} value={(f.options ?? []).join(', ')} onChange={x => setField(i, { options: x.target.value.split(',').map(s => s.trim()) })} placeholder="Choices, separated by commas" aria-label="Choices" />
              : <span />}
            <label className="row" style={{ fontSize: 13, gap: 6 }}><input type="checkbox" id={`f-req-${i}`} checked={!!f.required} onChange={x => setField(i, { required: x.target.checked })} />Required</label>
            <button className="btn danger sm" onClick={() => set('fields', e.fields.filter((_, j) => j !== i))} aria-label="Remove question">×</button>
          </div>
        ))}
        <div><button className="btn ghost sm" onClick={() => set('fields', [...e.fields, { key: '', label: '', type: 'text', required: false }])}>+ Add question</button></div>
      </div>

      {!isNew && (
        <div className="card">
          <h2>Delete event</h2>
          <p className="muted" style={{ margin: 0 }}>This also deletes every registration for it. To hide it instead, unpublish.</p>
          {confirmDel ? <div className="row"><button className="btn danger" onClick={remove}>Yes, delete it</button><button className="btn ghost" onClick={() => setConfirmDel(false)}>Cancel</button></div>
                      : <div><button className="btn danger" onClick={() => setConfirmDel(true)}>Delete event</button></div>}
        </div>
      )}
    </div>
  );
}

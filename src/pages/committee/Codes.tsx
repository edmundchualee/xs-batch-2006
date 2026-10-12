import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Chrome';

interface Code { code: string; max_uses: number; uses: number; active: boolean; created_at: string }

export default function Codes() {
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [members, setMembers] = useState<{ full_name: string; email: string }[]>([]);
  const [copied, setCopied] = useState('');

  async function load() {
    const [a, b] = await Promise.all([
      supabase.from('committee_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('committee').select('full_name,email').order('full_name'),
    ]);
    setCodes((a.data ?? []) as Code[]);
    setMembers(b.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = 'XS06-' + Array.from(crypto.getRandomValues(new Uint32Array(8)), n => chars[n % chars.length]).join('');
    await supabase.from('committee_codes').insert({ code, max_uses: 3 });
    load();
  }

  if (!codes) return <Spinner />;
  return (
    <div className="rows" style={{ gap: 18 }}>
      <div className="card">
        <div className="row spread"><h2>Committee codes</h2><button className="btn sm" onClick={create}>+ New code</button></div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Give a code to a batchmate who should help run events. They use it on the Committee page under “I have a committee code”. Batchmates registering for events don’t need a code or an account.</p>
        <div className="tbl">
          <table>
            <thead><tr><th>Code</th><th>Used</th><th /></tr></thead>
            <tbody>{codes.map(c => (
              <tr key={c.code}>
                <td><code style={{ userSelect: 'all', fontSize: 15 }}>{c.code}</code> <button className="btn ghost sm" onClick={async () => { try { await navigator.clipboard.writeText(c.code); setCopied(c.code); } catch { /* select manually */ } }}>{copied === c.code ? 'Copied' : 'Copy'}</button></td>
                <td>{c.uses} / {c.max_uses}{!c.active && <span className="pill muted" style={{ marginLeft: 8 }}>Off</span>}</td>
                <td><button className="btn ghost sm" onClick={async () => { await supabase.from('committee_codes').update({ active: !c.active }).eq('code', c.code); load(); }}>{c.active ? 'Turn off' : 'Turn on'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>Committee members</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{members.map(m => <li key={m.email}>{m.full_name || m.email} <span className="muted">· {m.email}</span></li>)}</ul>
      </div>
    </div>
  );
}

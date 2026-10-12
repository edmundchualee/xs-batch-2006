import { createClient } from '@supabase/supabase-js';

// Public by design: database security rules decide what anyone can read or change.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://ogxctvnjybggdikdmjhp.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_5NjkR8cAjYzXlzfQzwqsqQ_J0sdiXgJ';

export const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

const MESSAGES: Record<string, string> = {
  INVALID_CODE: 'That committee code isn’t valid or has been used up.',
  EVENT_NOT_FOUND: 'This event isn’t available anymore.',
  REGISTRATION_CLOSED: 'Registration for this event is closed.',
  NAME_REQUIRED: 'Please enter your full name.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  ALREADY_REGISTERED: 'You’re already registered for this event with that email. See you there!',
};

export function friendlyError(raw: string): string {
  if (/Database error saving new user/i.test(raw)) return MESSAGES.INVALID_CODE;
  if (/Invalid login credentials/i.test(raw)) return 'Email or password is incorrect.';
  if (/duplicate key.*slug/i.test(raw)) return 'Another event already uses that web address. Change the “Link name”.';
  if (/events_slug_check/i.test(raw)) return 'The link name can only use lowercase letters, numbers and dashes.';
  const field = raw.match(/FIELD_REQUIRED:(.+)/);
  if (field) return `Please answer “${field[1].trim()}”.`;
  for (const k of Object.keys(MESSAGES)) if (raw.includes(k)) return MESSAGES[k];
  return raw;
}

export interface Field { key: string; label: string; type: 'text' | 'select' | 'yesno'; options?: string[]; required?: boolean }

export interface EventRow {
  id: string; slug: string; title: string; tagline: string; starts_at: string | null;
  venue: string; venue_map_url: string; description: string; fee: string; payment_info: string;
  capacity: number | null; registration_deadline: string | null; registration_open: boolean;
  published: boolean; fields: Field[];
}

export interface Registration {
  id: string; event_id: string; full_name: string; email: string; mobile: string;
  answers: Record<string, string>; status: 'registered' | 'waitlist' | 'cancelled'; paid: boolean; notes: string; created_at: string;
}

const TZ = 'Asia/Manila';
export const fmt = {
  date: (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-PH', { timeZone: TZ, weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be announced',
  time: (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }) : '',
  day: (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-PH', { timeZone: TZ, day: 'numeric' }) : '—',
  mon: (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-PH', { timeZone: TZ, month: 'short' }) : 'TBA',
};

export const isClosed = (e: EventRow) =>
  !e.registration_open || (!!e.registration_deadline && new Date(e.registration_deadline) < new Date());

export const isPast = (e: EventRow) => !!e.starts_at && new Date(e.starts_at).getTime() < Date.now() - 12 * 3600e3;

/** datetime-local input value (Manila time) <-> ISO */
export function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 8 * 3600e3);
  return d.toISOString().slice(0, 16);
}
export function fromLocalInput(v: string) {
  return v ? new Date(v + ':00+08:00').toISOString() : null;
}

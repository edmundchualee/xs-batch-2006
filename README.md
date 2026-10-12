# Xavier School Batch 2006

Batch site for XS 2006: a home page, an events list, and a registration form for each event. The committee adds events and manages sign-ups from `/committee`. No code needed.

*A batch-run alumni site, not an official Xavier School website.*

## Setup (one time)

1. **Database:** Supabase → SQL Editor → New query → paste `supabase/setup.sql` → Run. The result shows the first **committee code**.
2. **Auth:** Supabase → Authentication → Sign In / Providers. Keep **Allow new users to sign up** on and turn **Confirm email** off. Only people with a committee code can create accounts; batchmates registering for events don't need one.
3. **Hosting:** Vercel → Add New → Project → import this repo → Deploy.
4. Open `your-site/committee` → **I have a committee code** → create your account.

## Committee

- **Events → + New event:** title, date, venue, fee, how to pay, slot limit, deadline, and extra questions (there's a one-click golf set: handicap, shirt size, dinner).
- **Save** keeps it as a draft; **Save & publish** puts it on the site.
- **Registrations:** mark who has paid, move people to waitlist or cancelled, add notes, **Download for Excel**.
- **Committee access:** make codes for other committee members.

When an event has a slot limit, sign-ups past the limit go to the waitlist automatically.

## Development

```bash
npm install
npm run dev
PGHOST=localhost PGUSER=postgres npm run test:db   # database tests on a throwaway local Postgres
```

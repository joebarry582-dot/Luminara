# Real Supabase Integration Guide

This mock is built to be easily replaceable with real Supabase.

## Step 1: Create Supabase Project
1. Go to https://supabase.com and create new project.
2. Note your `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings > API.

## Step 2: Run Database Migrations
In Supabase SQL Editor, run the following to create tables (with RLS enabled for security):

```sql
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- PROFILES (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  email text,
  avatar text,
  role text default 'user' check (role in ('user','moderator','administrator')),
  experience_points integer default 0,
  rank text default 'Cadet',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- REPORTS
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  category text,
  severity text check (severity in ('low','medium','high','critical')),
  latitude numeric,
  longitude numeric,
  status text default 'pending' check (status in ('pending','approved','rejected','archived')),
  images text[], -- array of storage paths or base64 for demo
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.reports enable row level security;

-- Add policies (example - customize for your needs)
create policy "Reports viewable by authenticated users" on reports for select using (auth.role() = 'authenticated');
create policy "Users can create reports" on reports for insert with check (auth.uid() = created_by);
create policy "Admins and moderators can update reports" on reports for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('administrator', 'moderator'))
);

-- Similar for other tables: weather_logs, chat_messages, notifications, bookmarks, activity_logs
-- (Full schema in main README or expand as needed)

-- Enable Realtime for tables
alter publication supabase_realtime add table reports, chat_messages, notifications;
```

Create storage bucket `report-images` (public or private with policies).

## Step 3: Replace Mock in Code
1. In `index.html` (or your entry), replace the mock script with:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

2. In `scripts/mock-supabase.js`, either delete or wrap:
```js
// Real client
const supabase = window.supabase.createClient('YOUR_URL', 'YOUR_ANON_KEY');

// Then update all calls in other JS files from mockSupabase to supabase
// Most .from('table').select() etc. are compatible.
```

3. Update `auth.js` to use `supabase.auth.signInWithPassword`, `signUp`, `onAuthStateChange`, `getUser`.

4. For realtime in `reports.js`, `radio.js` etc.:
```js
supabase
  .channel('reports-channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, payload => {
    // handle new report
  })
  .subscribe();
```

## Security Notes
- Always enable RLS.
- Use service_role key ONLY on server (never expose).
- For admin actions, create Edge Functions or check role server-side.
- Password hashing is automatic in Supabase Auth.

## Recommended Production Additions
- Edge Functions for AI (call LLM), image processing, notifications push.
- Row Level Security fine-tuned per role.
- Database triggers for activity_logs on every insert/update.
- Storage policies for images.

Once migrated, your LUMINARA will be a true production satellite command platform with live collaboration across the globe.

Contact xAI or build upon this foundation. The universe awaits.

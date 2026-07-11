-- =====================================================
-- LUMINARA Satellite Command - Supabase Schema (Real)
-- =====================================================
-- Run this entire script in the Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text,
  avatar text,
  role text not null default 'user' check (role in ('user', 'moderator', 'administrator')),
  experience_points integer default 100,
  rank text default 'Cadet',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- =====================================================
-- REPORTS TABLE
-- =====================================================
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  category text,
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  latitude numeric,
  longitude numeric,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'archived')),
  images text[],                    -- Array of image URLs from Storage
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

-- RLS Policies for reports
create policy "Authenticated users can view reports"
  on reports for select using (auth.role() = 'authenticated');

create policy "Users can create their own reports"
  on reports for insert with check (auth.uid() = created_by);

create policy "Users can update their own reports"
  on reports for update using (auth.uid() = created_by);

create policy "Moderators and Admins can update any report"
  on reports for update using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('moderator', 'administrator')
    )
  );

create policy "Admins can delete reports"
  on reports for delete using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role = 'administrator'
    )
  );

-- =====================================================
-- CHAT_MESSAGES TABLE (Radio)
-- =====================================================
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  channel text not null check (channel in ('general', 'emergency', 'weather', 'operations')),
  message text not null,
  user_id uuid references public.profiles(id),
  username text,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Authenticated users can view chat messages"
  on chat_messages for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert messages"
  on chat_messages for insert with check (auth.role() = 'authenticated');

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  title text not null,
  message text,
  type text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "System can insert notifications"
  on notifications for insert with check (true);

create policy "Users can update their own notifications"
  on notifications for update using (auth.uid() = user_id);

-- =====================================================
-- BOOKMARKS TABLE
-- =====================================================
create table public.bookmarks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  created_at timestamptz default now()
);

alter table public.bookmarks enable row level security;

create policy "Users can manage their own bookmarks"
  on bookmarks for all using (auth.uid() = user_id);

-- =====================================================
-- ACTIVITY_LOGS TABLE
-- =====================================================
create table public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.activity_logs enable row level security;

create policy "Users can view their own activity"
  on activity_logs for select using (auth.uid() = user_id);

create policy "System can insert activity logs"
  on activity_logs for insert with check (true);

-- =====================================================
-- WEATHER_LOGS TABLE (Optional - for future satellite data)
-- =====================================================
create table public.weather_logs (
  id uuid default uuid_generate_v4() primary key,
  temperature numeric,
  humidity numeric,
  wind numeric,
  uv numeric,
  pressure numeric,
  location text,
  created_at timestamptz default now()
);

alter table public.weather_logs enable row level security;

create policy "Authenticated users can view weather logs"
  on weather_logs for select using (auth.role() = 'authenticated');

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
alter publication supabase_realtime add table reports;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table notifications;

-- =====================================================
-- STORAGE BUCKET FOR REPORT IMAGES
-- =====================================================
-- Run this in Supabase Dashboard → Storage or via SQL:
insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true);

-- Storage policies (allow authenticated uploads)
create policy "Authenticated users can upload report images"
  on storage.objects for insert
  with check (bucket_id = 'report-images' and auth.role() = 'authenticated');

create policy "Anyone can view report images"
  on storage.objects for select
  using (bucket_id = 'report-images');

-- =====================================================
-- HELPER FUNCTION: Auto-create profile on signup
-- =====================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- DONE
-- =====================================================
-- After running this:
-- 1. Go to Authentication → Providers → Enable Email
-- 2. Go to Storage and make sure "report-images" bucket exists
-- 3. Copy your Supabase URL and anon key into supabase-client.js
-- =====================================================
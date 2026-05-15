-- ═══════════════════════════════════════════════════
-- LUMIÈRE — Complete Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════

-- EVENTS TABLE
create table public.events (
  slug        text primary key,
  name        text not null,
  type        text not null default 'other',
  date        date,
  location    text,
  emoji       text default '🎊',
  owner_id    uuid references auth.users(id) on delete cascade not null,
  tier        text not null default 'free',  -- 'free' | 'pro' | 'elite'
  payment_id  text,
  photo_count integer default 0,
  created_at  timestamptz default now()
);

-- PHOTOS TABLE
create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  event_slug   text references public.events(slug) on delete cascade not null,
  guest_name   text,
  storage_path text not null,
  url          text not null,
  mime_type    text default 'image/jpeg',
  file_size    bigint,
  created_at   timestamptz default now()
);

-- INDEXES for performance
create index photos_event_slug_idx on public.photos(event_slug);
create index events_owner_idx on public.events(owner_id);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════
alter table public.events enable row level security;
alter table public.photos enable row level security;

-- EVENTS policies
-- Owner can do everything with their events
create policy "Owner full access to own events"
  on public.events for all
  using (auth.uid() = owner_id);

-- Anyone can read events (needed for guest page to load event info)
create policy "Anyone can read events"
  on public.events for select
  using (true);

-- PHOTOS policies
-- Anyone can insert photos (guests upload without account)
create policy "Anyone can insert photos"
  on public.photos for insert
  with check (true);

-- Anyone can read photos (shared gallery)
create policy "Anyone can read photos"
  on public.photos for select
  using (true);

-- Only event owner can delete photos
create policy "Owner can delete photos"
  on public.photos for delete
  using (
    auth.uid() = (
      select owner_id from public.events
      where slug = photos.event_slug
    )
  );

-- ═══════════════════════════════════════════════════
-- STORAGE BUCKET (run separately or via dashboard)
-- ═══════════════════════════════════════════════════
-- 1. Go to Storage → New bucket → Name: "event-photos" → Public: YES
-- 2. Then run these storage policies:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  20971520,  -- 20MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

-- Storage: Anyone can upload
create policy "Anyone can upload event photos"
  on storage.objects for insert
  with check (bucket_id = 'event-photos');

-- Storage: Anyone can read (public gallery)
create policy "Anyone can read event photos"
  on storage.objects for select
  using (bucket_id = 'event-photos');

-- Storage: Owner can delete their event's photos
create policy "Owner can delete event photos"
  on storage.objects for delete
  using (
    bucket_id = 'event-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ═══════════════════════════════════════════════════
-- REALTIME (enable for live gallery updates)
-- ═══════════════════════════════════════════════════
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.events;

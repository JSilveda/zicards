-- Notes module: Notion-like nested pages with block content (JSONB).
-- IMPORTANT: run this in the Supabase SQL editor for both local and production projects.

create table if not exists note_pages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled',
  content jsonb not null default '[]'::jsonb,
  icon text,
  parent_id uuid references note_pages(id) on delete cascade,
  position integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_note_pages_user_id on note_pages(user_id);
create index if not exists idx_note_pages_parent_id on note_pages(parent_id);

alter table note_pages enable row level security;

create policy "Users can view own note pages" on note_pages
  for select using (auth.uid() = user_id);

create policy "Users can insert own note pages" on note_pages
  for insert with check (auth.uid() = user_id);

create policy "Users can update own note pages" on note_pages
  for update using (auth.uid() = user_id);

create policy "Users can delete own note pages" on note_pages
  for delete using (auth.uid() = user_id);
